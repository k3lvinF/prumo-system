// Read the real backup only; apply schema changes exclusively to a new local copy.
// Run with node --import tsx scripts/audit-backup.mjs <backup-dir> <v29-checkout>.
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, constants, mkdtempSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { normalizeCatalog } from '../lib/catalog-normalize.ts';
import { menuCatalogSchema } from '../lib/menu-catalog.ts';
import { totals, productionSourceTotals, normalizeWorkName, num } from '../lib/uan.ts';
import { hourDays } from '../lib/hours.ts';

const [backupArg, baselineArg] = process.argv.slice(2);
if (!backupArg || !baselineArg) throw Error('Informe backup completo e checkout v29.');
const backup = resolve(backupArg), baseline = resolve(baselineArg);
const manifest = JSON.parse(readFileSync(resolve(backup, 'manifest.json'), 'utf8'));
if (!manifest.complete) throw Error('Backup incompleto.');
const original = new DatabaseSync(resolve(backup, 'restored.sqlite'), { readOnly: true });
const old = await import(pathToFileURL(resolve(baseline, 'lib/uan.ts')).href);
const oldHours = await import(pathToFileURL(resolve(baseline, 'lib/hours.ts')).href);
const hash = value => createHash('sha256').update(String(value)).digest('hex');
const short = value => hash(value).slice(0, 8);
const q = value => '"' + value.replaceAll('"', '""') + '"';
const tables = original.prepare("SELECT name FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();
const counts = db => Object.fromEntries(tables.map(({ name }) => [name, db.prepare(`SELECT count(*) AS n FROM ${q(name)}`).get().n]));
mkdirSync('work', { recursive: true });
const rehearsal = mkdtempSync(resolve('work/rehearsal-'));
const dbPath = resolve(rehearsal, 'migrated.sqlite');
copyFileSync(resolve(backup, 'restored.sqlite'), dbPath, constants.COPYFILE_EXCL);
const migrated = new DatabaseSync(dbPath);
const before = counts(original);
for (const file of ['0008_freezing_eternity.sql', '0009_lyrical_queen_noir.sql', '0010_many_scarecrow.sql']) {
  const sql = readFileSync(resolve('drizzle', file), 'utf8');
  if (/\b(DROP|DELETE|UPDATE)\b/i.test(sql.replace(/--[^\n]*/g, ''))) throw Error('Migração não aditiva.');
  migrated.exec(sql);
}
const after = counts(migrated);
if (JSON.stringify(before) !== JSON.stringify(after)) throw Error('Contagens alteradas pela migração.');
const dataEqual = tables.every(({ name }) => {
  const read = db => JSON.stringify(db.prepare(`SELECT * FROM ${q(name)} ORDER BY rowid`).all());
  return hash(read(original)) === hash(read(migrated));
});
// Added production columns legitimately differ; compare the original columns.
let preserved = true;
for (const { name } of tables) {
  const cols = original.prepare(`PRAGMA table_info(${q(name)})`).all().map(c => q(c.name)).join(',');
  const read = db => JSON.stringify(db.prepare(`SELECT ${cols} FROM ${q(name)} ORDER BY rowid`).all());
  if (hash(read(original)) !== hash(read(migrated))) preserved = false;
}
if (!preserved) throw Error('Conteúdo original divergiu na simulação.');
const lines = ['# PRUMO — backup e diagnóstico inicial', '', `Gerado em ${new Date().toISOString()}.`, '',
  'Esta é a validação do backup e uma simulação local das migrações existentes. Não conclui a auditoria de todas as fases nem autoriza deploy das correções.', '',
  '## Preservação', '',
  '- Backup lógico completo, arquivos R2 copiados e segunda leitura sem divergências.',
  '- Restauração SQLite íntegra; janela sem gravações exigida (não é snapshot transacional nativo).',
  '- Migrações 0008–0010 aplicadas apenas à cópia local.',
  `- Conteúdo de todas as colunas antigas preservado: ${preserved ? 'sim' : 'NÃO'}.`,
  `- Novas colunas alteram a forma das linhas: ${dataEqual ? 'não' : 'sim, esperado'}.`, '',
  '| Tabela | Antes | Depois |', '|---|---:|---:|', ...Object.keys(before).map(name => `| ${name} | ${before[name]} | ${after[name]} |`), '',
  '## Produções: cálculos v29 × branch em correção', '',
  '| Registro (hash) | Indicador | v29 | Branch |', '|---|---|---:|---:|'];
const findings = [];
for (const row of original.prepare('SELECT id,owner,date,data FROM productions').all()) {
  const production = JSON.parse(row.data), a = old.totals(production), b = totals(production);
  const sourceA = old.productionSourceTotals(production), sourceB = productionSourceTotals(production);
  for (const [label, x, y] of [['Peso líquido (kg)', a.weight, b.weight], ['Cozido (kg)', sourceA.cooked, sourceB.cookedTotal],
    ['Rendimento', sourceA.yield, sourceB.yieldTotal], ['Custo', a.complete ? a.cost : null, b.complete ? b.cost : null], ['CMV (%)', a.cmv, b.cmv]]) {
    const display = v => v == null ? 'pendente' : Number(v.toFixed(6));
    lines.push(`| ${short(row.id)} | ${label} | ${display(x)} | ${display(y)} |`);
  }
  const accounts = [...new Set((production.audit ?? []).map(a => String(a.account ?? '').trim().toLowerCase()).filter(Boolean))];
  if (!accounts.length) findings.push(`C1: produção ${short(row.id)} sem histórico de conta para concluir propriedade.`);
  else if (!accounts.includes(String(row.owner).trim().toLowerCase())) findings.push(`C1: produção ${short(row.id)} com proprietário ausente do histórico (${accounts.length} identidade(s)); revisão manual.`);
  if (row.date !== production.date) findings.push(`M5: data divergente na produção ${short(row.id)}.`);
  if ((production.audit ?? []).some(a => /Consolidou \d+ obra/.test(a.action ?? ''))) findings.push(`A6: produção ${short(row.id)} contém consolidação antiga; valores descartados não são recuperáveis automaticamente.`);
  for (const prep of production.preps ?? []) {
    if (!prep.ingredients?.length || prep.cost == null) continue;
    const cost = prep.ingredients.reduce((sum, i) => sum + (num(i.qty) ?? 0) * (num(i.price) ?? 0), 0);
    if (Math.abs(cost - prep.cost) > Math.max(Math.abs(prep.cost) * 0.05, 0.01)) findings.push(`M4: preparo ${short(prep.id)} em ${short(row.id)} difere mais de 5% da soma legada; unidades precisam ser conferidas antes de corrigir.`);
  }
}
lines.push('', 'Diferenças de rendimento exigem revisão da separação entre GNs e marmitas (C2). Campos pendentes não foram convertidos para zero.', '', '## Catálogos e equipamentos', '');
const expectedPhotos = new Set();
for (const row of original.prepare('SELECT owner,data FROM menu_catalogs').all()) {
  const raw = JSON.parse(row.data), normalized = normalizeCatalog(raw), ownerHash = hash(row.owner.trim().toLowerCase());
  const sheets = Array.isArray(raw.technicalSheets) ? raw.technicalSheets : [];
  const equipment = Array.isArray(raw.equipment) ? raw.equipment : [];
  lines.push(`- Conta ${short(row.owner)}: ${sheets.length} ficha(s), ${equipment.length} equipamento(s), ${normalized.invalid.length} item(ns) em revisão. Schema completo: ${menuCatalogSchema.safeParse(raw).success ? 'válido' : 'requer revisão'}.`);
  if (normalized.invalid.length) findings.push(`N4: conta ${short(row.owner)} tem ${normalized.invalid.length} item(ns) inválido(s), preservados no backup.`);
  const duplicate = new Map();
  for (const e of equipment) {
    if (!e || typeof e !== 'object') continue;
    if ([e.name, 'Nº ' + e.number, e.size].join(' · ').length > 80) findings.push(`N2: rótulo do equipamento ${short(e.id)} excede 80 caracteres.`);
    const key = normalizeWorkName(String(e.name ?? '')) + '/' + normalizeWorkName(String(e.number ?? ''));
    if (duplicate.has(key)) findings.push(`N13: equipamentos suspeitos ${short(duplicate.get(key))} e ${short(e.id)}; não fundidos.`);
    duplicate.set(key, e.id);
  }
  for (const sheet of sheets) if (sheet?.id) expectedPhotos.add(`technical-sheets/${ownerHash}/${sheet.id}`);
}
const evidenceColumns = original.prepare('PRAGMA table_info(hour_evidence)').all().map(c => c.name);
const keyColumn = ['r2_key', 'object_key', 'key'].find(key => evidenceColumns.includes(key));
const expectedEvidence = new Set(keyColumn ? original.prepare(`SELECT ${q(keyColumn)} AS objectKey FROM hour_evidence`).all().map(row => row.objectKey) : []);
const orphanPhotos = manifest.files.filter(file => file.key.startsWith('technical-sheets/') && !expectedPhotos.has(file.key));
const orphanEvidence = keyColumn ? manifest.files.filter(file => file.key.startsWith('hours/') && !expectedEvidence.has(file.key)) : null;
lines.push('', '## Arquivos', '', `- ${manifest.files.length} objeto(s), ${manifest.files.reduce((sum, f) => sum + f.size, 0)} bytes copiados.`,
  `- Fotos sem ficha correspondente: ${orphanPhotos.length}.`, `- Comprovantes sem referência: ${orphanEvidence?.length ?? 'não verificado; chave requer revisão'}.`);
if (orphanPhotos.length || orphanEvidence?.length) findings.push('B4/N10: objetos órfãos identificados; nenhum foi movido ou apagado.');
for (const duplicate of original.prepare('SELECT owner,date,count(*) AS n FROM productions GROUP BY owner,date HAVING count(*)>1').all()) findings.push(`M5: conta ${short(duplicate.owner)} tem ${duplicate.n} produções na mesma data; não mescladas.`);
const periodRows = original.prepare('SELECT p.*,COALESCE(m.pause,a.pause) AS pause,COALESCE(m.resume,a.resume) AS resume FROM hour_periods p LEFT JOIN hour_manual m ON m.period=p.id AND m.owner=p.owner LEFT JOIN hour_active a ON a.period=p.id AND a.owner=p.owner').all();
lines.push('', '## Horas', '', `- ${periodRows.length} períodos preservados byte a byte nas colunas originais.`, '',
  '| Conta (hash) | Mês | Segundos v29 | Segundos branch | Centavos v29 | Centavos branch |', '|---|---|---:|---:|---:|---:|');
for (const owner of new Set(periodRows.map(p => p.owner))) {
  const periods = periodRows.filter(p => p.owner === owner);
  const monthly = days => days.reduce((result, day) => {
    const month = day.date.slice(0, 7);
    const row = result[month] ?? { seconds: 0, cents: 0 };
    row.seconds += day.seconds; row.cents += day.cents; result[month] = row; return result;
  }, {});
  const a = monthly(oldHours.hourDays(periods, [])), b = monthly(hourDays(periods, []));
  if (JSON.stringify(a) !== JSON.stringify(b)) findings.push(`Horas: divergência de total mensal na conta ${short(owner)}; bloqueia a atualização.`);
  for (const month of new Set([...Object.keys(a), ...Object.keys(b)])) {
    lines.push(`| ${short(owner)} | ${month} | ${a[month]?.seconds ?? 0} | ${b[month]?.seconds ?? 0} | ${a[month]?.cents ?? 0} | ${b[month]?.cents ?? 0} |`);
  }
}
lines.push('', '## Decisões e pendências', '',
  ...(findings.length ? findings.map(f => '- ' + f) : ['- Nenhum caso detectado nas verificações iniciais executadas.']),
  '- Requisitos e testes das fases 2–4 ainda incompletos; migração estrutural mantém a espera de 30 dias.',
  '- Nenhum script de ajuste foi executado em produção.');
writeFileSync(resolve(backup, 'VALIDACAO-BACKUP.md'), lines.join('\n') + '\n', { mode: 0o600 });
original.close(); migrated.close();
console.log(JSON.stringify({ report: resolve(backup, 'VALIDACAO-BACKUP.md'), rehearsal: dbPath, preserved, tables: before, findings: findings.length, files: manifest.files.length }));
