import assert from 'node:assert/strict';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import { productionHandlers } from '../lib/production-api';
import { fresh } from '../lib/uan';

const sql = new DatabaseSync(':memory:');
for (const file of readdirSync('drizzle').filter(name => /^\d+.*\.sql$/.test(name)).sort()) {
  for (const statement of readFileSync('drizzle/' + file, 'utf8').split('--> statement-breakpoint')) if (statement.trim()) sql.exec(statement);
}
function prepare(query: string) {
  let args: SQLInputValue[] = [];
  return {
    bind(...values: SQLInputValue[]) { args = values; return this; },
    async first() { return sql.prepare(query).get(...args) ?? null; },
    async all() { return { results: sql.prepare(query).all(...args) }; },
    async run() { return { meta: { changes: Number(sql.prepare(query).run(...args).changes) } }; },
  };
}
const db = {
  prepare,
  async batch(statements: ReturnType<typeof prepare>[]) {
    sql.exec('BEGIN IMMEDIATE');
    try {
      const results = [];
      for (const statement of statements) results.push(await statement.run());
      sql.exec('COMMIT');
      return results;
    } catch (error) {
      sql.exec('ROLLBACK');
      throw error;
    }
  },
};
const api = productionHandlers(db, async () => ({ userId: 'owner' }));
const request = (data: unknown, reason?: string) => new Request('https://example.test/api/productions', {
  method: 'POST', headers: { 'content-type': 'application/json', 'x-prumo-request': '1', origin: 'https://example.test' },
  body: JSON.stringify({ data, action: 'Teste de auditoria', ...(reason ? { reason } : {}) }),
});
let state = fresh('2026-09-30', 'RT');
state.preps = [{ id: 'rice', name: 'Arroz', raw: 10, clean: null, portion: null, cost: null, costComplete: false, remaining: null, loss: null, closed: false, note: '' }];
state.works = [{ id: 'work', name: 'Obra', worker: null, admin: null, servedWorker: null, servedAdmin: null, vehicle: '', driver: '', route: '' }];
const at = new Date().toISOString();
state.entries = [{ id: 'entry', prep: 'rice', work: 'work', type: 'GN M', quantity: 1, tare: 1, gross: 8, temperature: 70, vehicle: '', driver: '', route: '', operator: 'RT', at, created: at, note: '', cancelled: false }];
let response = await api.POST(request(state));
assert.equal(response.status, 200, await response.clone().text());
state = await response.json();
assert.equal(state.audit.length, 0, 'o JSON legado para de crescer quando a tabela estruturada existe');
assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM production_entries').get()!.n, 1);
const summary = sql.prepare('SELECT operator,summary_version,item_count FROM productions').get()!;
assert.equal(summary.operator, 'RT'); assert.equal(summary.summary_version, 1); assert.equal(summary.item_count, 1);
const history = await (await api.GET(new Request('https://example.test/api/productions?limit=60'))).json() as Array<{ id: string }>;
assert.equal(history.length, 1);
assert.equal((await api.GET(new Request('https://example.test/api/productions?limit=61'))).status, 400);
assert.equal((await api.GET(new Request('https://example.test/api/productions?before=invalid'))).status, 400);
state.entries[0].gross = 9;
response = await api.POST(request(state));
assert.equal(response.status, 400);
response = await api.POST(request(state, 'Correção conferida pelo responsável'));
assert.equal(response.status, 200, await response.clone().text());
state = await response.json();
const audit = sql.prepare('SELECT reason,changes FROM production_audit').get()!;
assert.equal(audit.reason, 'Correção conferida pelo responsável');
assert.equal(JSON.parse(String(audit.changes))[0].before, 8);
assert.equal(JSON.parse(String(audit.changes))[0].after, 9);
assert.equal(JSON.parse(String(sql.prepare('SELECT data FROM production_entries').get()!.data)).gross, 9, 'edição atualiza a cópia normalizada');

state.preps[0] = { ...state.preps[0], remaining: 0, loss: 0, closed: true };
response = await api.POST(request(state));
assert.equal(response.status, 200, await response.clone().text());
state = await response.json();
const illegalClosedEdit = structuredClone(state);
illegalClosedEdit.preps[0].raw = 11;
assert.equal((await api.POST(request(illegalClosedEdit, 'Tentativa com justificativa informada'))).status, 400);
state.preps[0].closed = false;
assert.equal((await api.POST(request(state))).status, 400);
response = await api.POST(request(state, 'Reabertura autorizada pelo responsável'));
assert.equal(response.status, 200, await response.clone().text());
state = await response.json();

const versionBefore = state.version;
sql.exec("CREATE TRIGGER fail_audit BEFORE INSERT ON production_audit BEGIN SELECT RAISE(ABORT,'synthetic audit failure'); END;");
state.entries[0].gross = 10;
response = await api.POST(request(state, 'Nova correção conferida pelo responsável'));
assert.equal(response.status, 503);
const persisted = JSON.parse(String(sql.prepare('SELECT data FROM productions').get()!.data));
assert.equal(persisted.version, versionBefore, 'falha da auditoria reverte o salvamento principal');
assert.equal(persisted.entries[0].gross, 9);
assert.equal(JSON.parse(String(sql.prepare('SELECT data FROM production_entries').get()!.data)).gross, 9);
console.log('PASS: motivo obrigatório, antes/depois, JSON legado congelado, entrada normalizada atualizada e rollback atômico.');
sql.close();
