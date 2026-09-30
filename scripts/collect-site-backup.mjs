// Usage: node scripts/collect-site-backup.mjs <https-origin> <new-backup-directory>
// Credentials arrive as one JSON line on stdin, never as CLI args or files:
// {"siteToken":"…","backupToken":"…"}. Never include actual values in logs.
import { mkdir, writeFile, open } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { createInterface } from 'node:readline';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { createWriteStream } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const [originArgument, directoryArgument] = process.argv.slice(2);
if (!originArgument || !directoryArgument) throw Error('Informe origem HTTPS e diretório novo para o backup.');
const origin = new URL(originArgument);
if (origin.protocol !== 'https:' || origin.pathname !== '/' || origin.username || origin.password || origin.search || origin.hash) throw Error('Origem HTTPS inválida.');
const directory = resolve(directoryArgument);
const input = createInterface({ input: process.stdin, terminal: false });
const credentials = JSON.parse(await new Promise(resolveLine => input.once('line', resolveLine)));
input.close();
if (!credentials.siteToken || !credentials.backupToken) throw Error('Credenciais de exportação ausentes.');
const quote = name => '"' + name.replaceAll('"', '""') + '"';
const digest = value => createHash('sha256').update(value).digest('hex');
async function request(params) {
  const url = new URL('/api/admin-backup', origin);
  url.search = new URLSearchParams(params).toString();
  const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(120_000), headers: {
    'OAI-Sites-Authorization': 'Bearer ' + credentials.siteToken,
    'X-Prumo-Backup-Token': credentials.backupToken,
  } });
  if (!response.ok) throw Error('Exportação recusada (HTTP ' + response.status + ').');
  return response;
}
async function json(params) {
  const response = await request(params);
  if (!response.headers.get('content-type')?.includes('application/json')) throw Error('Resposta de autenticação inesperada.');
  return response.json();
}
async function tableData(table, sqlFile, local) {
  const hash = createHash('sha256');
  let count = 0, offset = 0;
  while (true) {
    const page = await json({ mode: 'rows', table: table.name, offset: String(offset) });
    if (!Array.isArray(page.rows) || page.rows.length > 1) throw Error('Página inválida.');
    for (const row of page.rows) {
      if (row.length !== page.columns.length || !row.every(value => typeof value === 'string')) throw Error('Linha inválida.');
      const statement = `INSERT INTO ${quote(table.name)} (${page.columns.map(quote).join(',')}) VALUES (${row.join(',')});\n`;
      hash.update(statement);
      if (sqlFile) await sqlFile.write(statement);
      if (local) local.exec(statement);
      count++;
    }
    if (page.nextOffset === null) break;
    if (page.nextOffset !== offset + 1 || page.rows.length !== 1) throw Error('Paginação inválida.');
    offset = page.nextOffset;
  }
  if (count !== table.count) throw Error('Contagem mudou durante a cópia. Reinicie sem coletas simultâneas.');
  return { count, sha256: hash.digest('hex') };
}
async function fileList() {
  let cursor;
  const objects = [], seen = new Set();
  do {
    const page = await json({ mode: 'files', ...(cursor ? { cursor } : {}) });
    objects.push(...page.objects);
    cursor = page.cursor;
    if (cursor && seen.has(cursor)) throw Error('Paginação R2 repetida.');
    if (cursor) seen.add(cursor);
  } while (cursor);
  return objects.sort((a, b) => a.key.localeCompare(b.key, 'en'));
}
const fileSignature = objects => digest(JSON.stringify(objects.map(({ key, size, etag, httpMetadata, customMetadata }) => ({ key, size, etag, httpMetadata, customMetadata }))));
await mkdir(directory, { mode: 0o700 }); // Refuse to overwrite a prior backup.
await mkdir(resolve(directory, 'objects'), { mode: 0o700 });
const schema = await json({ mode: 'schema' });
if (schema.format !== 'prumo-logical-backup-v1') throw Error('Formato de backup inesperado.');
const sqlFile = await open(resolve(directory, 'd1.sql'), 'wx', 0o600);
const local = new DatabaseSync(resolve(directory, 'restored.sqlite'));
const report = { format: schema.format, startedAt: new Date().toISOString(), complete: false,
  atomicSnapshot: false, requiresQuietWindow: true, tables: {}, files: [] };
try {
  await writeFile(resolve(directory, 'schema.json'), JSON.stringify(schema), { mode: 0o600, flag: 'wx' });
  await sqlFile.write('PRAGMA foreign_keys=OFF;\n');
  local.exec('PRAGMA foreign_keys=OFF;');
  for (const object of schema.objects.filter(object => object.type === 'table')) {
    await sqlFile.write(object.sql + ';\n');
    local.exec(object.sql);
  }
  for (const table of schema.tables) report.tables[table.name] = await tableData(table, sqlFile, local);
  for (const object of schema.objects.filter(object => object.type !== 'table')) {
    await sqlFile.write(object.sql + ';\n');
    local.exec(object.sql);
  }
  const files = await fileList();
  for (const object of files) {
    const filename = digest(object.key) + '.bin'; // R2 keys never become filesystem paths.
    const response = await request({ mode: 'file', key: object.key, etag: object.etag });
    const hash = createHash('sha256');
    let bytes = 0;
    const source = Readable.fromWeb(response.body);
    source.on('data', chunk => { hash.update(chunk); bytes += chunk.length; });
    await pipeline(source, createWriteStream(resolve(directory, 'objects', filename), { flags: 'wx', mode: 0o600 }));
    if (bytes !== object.size) throw Error('Arquivo incompleto.');
    report.files.push({ ...object, filename, sha256: hash.digest('hex') });
  }
  // Independent second read catches concurrent changes. This is not a native
  // transactional snapshot; operations must be paused for the entire export.
  const secondSchema = await json({ mode: 'schema' });
  if (JSON.stringify(schema) !== JSON.stringify(secondSchema)) throw Error('Estrutura/contagens mudaram durante a cópia.');
  for (const table of schema.tables) {
    const verified = await tableData(table);
    if (JSON.stringify(verified) !== JSON.stringify(report.tables[table.name])) throw Error('Dados mudaram durante a cópia.');
    const restored = local.prepare(`SELECT COUNT(*) AS n FROM ${quote(table.name)}`).get().n;
    if (restored !== table.count) throw Error('Contagem restaurada divergente.');
  }
  if (fileSignature(files) !== fileSignature(await fileList())) throw Error('Arquivos mudaram durante a cópia.');
  const integrity = local.prepare('PRAGMA integrity_check').all();
  if (integrity.length !== 1 || Object.values(integrity[0])[0] !== 'ok') throw Error('Falha na integridade da restauração.');
  if (local.prepare('PRAGMA foreign_key_check').all().length) throw Error('Referências inválidas na restauração; requer revisão.');
  report.complete = true;
  report.finishedAt = new Date().toISOString();
} finally {
  await sqlFile.close();
  local.close();
  await writeFile(resolve(directory, 'manifest.json'), JSON.stringify(report, null, 2), { mode: 0o600, flag: 'wx' });
}
console.log('Cópia e restauração SQLite verificadas. A consistência exige janela sem gravações.');
