// Generate a D1-importable SQL file from a verified local SQLite restoration.
// Parent-table rows are emitted before rows that reference them.
import { DatabaseSync } from 'node:sqlite';
import { open, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const [backupArgument] = process.argv.slice(2);
if (!backupArgument) throw Error('Informe o diretório do backup verificado.');
const directory = resolve(backupArgument);
const manifest = JSON.parse(await readFile(resolve(directory, 'manifest.json'), 'utf8'));
if (!manifest.complete) throw Error('Backup incompleto.');
const schema = JSON.parse(await readFile(resolve(directory, 'schema.json'), 'utf8'));
const db = new DatabaseSync(resolve(directory, 'restored.sqlite'), { readOnly: true });
const output = await open(resolve(directory, 'd1-restore.sql'), 'wx', 0o600);
const quote = name => '"' + name.replaceAll('"', '""') + '"';
const bytes = value => Buffer.isBuffer(value) ? value : value instanceof Uint8Array ? Buffer.from(value) : Buffer.from(String(value), 'utf8');
const literal = value => value === null ? 'NULL' : typeof value === 'number' || typeof value === 'bigint' ? String(value) :
  typeof value === 'string' ? `CAST(X'${bytes(value).toString('hex')}' AS TEXT)` : `X'${bytes(value).toString('hex')}'`;
const tables = schema.objects.filter(object => object.type === 'table');
const dependencies = new Map(tables.map(table => [table.name, new Set(
  db.prepare(`PRAGMA foreign_key_list(${quote(table.name)})`).all().map(row => row.table).filter(parent => parent !== table.name),
)]));
const ordered = [], pending = new Map(dependencies);
while (pending.size) {
  const ready = [...pending].filter(([, parents]) => [...parents].every(parent => !pending.has(parent)));
  if (!ready.length) throw Error('Dependência circular entre tabelas requer exportação nativa.');
  for (const [name] of ready) { ordered.push(name); pending.delete(name); }
}
try {
  await output.write('PRAGMA foreign_keys=ON;\nBEGIN TRANSACTION;\n');
  for (const object of tables) await output.write(object.sql + ';\n');
  for (const name of ordered) {
    const columns = db.prepare(`PRAGMA table_xinfo(${quote(name)})`).all().filter(column => column.hidden === 0);
    const list = columns.map(column => quote(column.name)).join(',');
    const primary = columns.filter(column => column.pk > 0).sort((a, b) => a.pk - b.pk);
    const order = primary.length ? primary.map(column => quote(column.name)).join(',') : 'rowid';
    const rows = db.prepare(`SELECT * FROM ${quote(name)} ORDER BY ${order}`).all();
    for (const row of rows) {
      const large = columns.filter(column => {
        const value = row[column.name];
        return (typeof value === 'string' || value instanceof Uint8Array) && bytes(value).length > 48_000;
      });
      if (large.length && !primary.length) throw Error(`Linha grande sem chave primária em ${name}.`);
      const initial = columns.map(column => large.includes(column) ? (typeof row[column.name] === 'string' ? `CAST(X'' AS TEXT)` : `X''`) : literal(row[column.name]));
      await output.write(`INSERT INTO ${quote(name)} (${list}) VALUES (${initial.join(',')});\n`);
      const where = primary.map(column => `${quote(column.name)}=${literal(row[column.name])}`).join(' AND ');
      for (const column of large) {
        const value = row[column.name], buffer = bytes(value), col = quote(column.name);
        for (let offset = 0; offset < buffer.length; offset += 48_000) {
          const chunk = buffer.subarray(offset, offset + 48_000).toString('hex');
          const part = typeof value === 'string' ? `CAST(X'${chunk}' AS TEXT)` : `X'${chunk}'`;
          await output.write(`UPDATE ${quote(name)} SET ${col}=${col}||${part} WHERE ${where};\n`);
        }
      }
    }
  }
  for (const object of schema.objects.filter(object => object.type !== 'table')) await output.write(object.sql + ';\n');
  await output.write('COMMIT;\nPRAGMA foreign_key_check;\n');
} finally {
  await output.close();
  db.close();
}
console.log('SQL D1 gerado com tabelas-pai antes das tabelas dependentes.');
