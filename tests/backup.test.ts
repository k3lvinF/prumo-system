import assert from 'node:assert/strict';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { backupGET } from '../lib/backup-api';

const sqlite = new DatabaseSync(':memory:');
sqlite.exec('CREATE TABLE productions(id TEXT PRIMARY KEY, owner TEXT, data TEXT, bytes BLOB, value REAL);');
const original = JSON.stringify({ text: "ação 'teste'", payload: 'x'.repeat(1_800_000) }) + '\0end';
sqlite.prepare('INSERT INTO productions VALUES(?,?,?,?,?)').run('a', 'owner', original, new Uint8Array([0, 255, 1]), 1.25);
const statements: string[] = [];
function prepare(query: string) {
  statements.push(query);
  let values: SQLInputValue[] = [];
  return {
    bind(...args: SQLInputValue[]) { values = args; return this; },
    async all() { return { results: sqlite.prepare(query).all(...values) }; },
    async first() { return sqlite.prepare(query).get(...values) ?? null; },
    async raw() { const statement = sqlite.prepare(query); statement.setReturnArrays(true); return statement.all(...values); },
  };
}
let r2Calls = 0;
const bucket = {
  async head() { return { key: 'hours/test', size: 3, etag: 'v1' }; },
  async list() { r2Calls++; return { objects: [{ key: 'hours/test', size: 3, etag: 'v1' }], truncated: true, cursor: 'second' }; },
  async get(_key: string, options: { onlyIf: { etagMatches: string } }) {
    r2Calls++;
    if (options.onlyIf.etagMatches !== 'v1') return { etag: 'v2' };
    return { body: new Response(new Uint8Array([1, 2, 3])).body, httpEtag: '"v1"' };
  },
};
const token = 'a'.repeat(64);
const env = { DB: { prepare } as unknown as D1Database, BUCKET: bucket as unknown as R2Bucket,
  PRUMO_BACKUP_TOKEN: token, PRUMO_BACKUP_UNTIL: new Date(Date.now() + 3600_000).toISOString() };
const request = (query = '', supplied = token) => new Request('https://example.test/api/admin-backup' + query, { headers: { 'x-prumo-backup-token': supplied } });
assert.equal((await backupGET(request(), { ...env, PRUMO_BACKUP_TOKEN: undefined })).status, 403);
assert.equal((await backupGET(request('', 'wrong'), env)).status, 403);
assert.equal((await backupGET(request(), { ...env, PRUMO_BACKUP_UNTIL: new Date(0).toISOString() })).status, 403);
assert.equal((await backupGET(request(), { ...env, PRUMO_BACKUP_UNTIL: new Date(Date.now() + 48 * 3600_000).toISOString() })).status, 403);
assert.equal(statements.length, 0);
assert.equal(r2Calls, 0);
const schemaResponse = await backupGET(request(), env);
assert.match(schemaResponse.headers.get('cache-control')!, /no-store/);
const schema = await schemaResponse.json() as { tables: { name: string; count: number }[]; objects: { sql: string }[] };
assert.deepEqual(schema.tables, [{ name: 'productions', count: 1 }]);
const page = await (await backupGET(request('?mode=rows&table=productions'), env)).json() as { rows: string[][]; nextOffset: number | null };
const restored = new DatabaseSync(':memory:');
restored.exec(schema.objects[0].sql);
restored.exec(`INSERT INTO productions VALUES(${page.rows[0].join(',')})`);
assert.deepEqual(restored.prepare('SELECT * FROM productions').get(), sqlite.prepare('SELECT * FROM productions').get());
assert.equal(page.nextOffset, 1);
const last = await (await backupGET(request('?mode=rows&table=productions&offset=1'), env)).json() as { nextOffset: number | null };
assert.equal(last.nextOffset, null);
assert.equal((await backupGET(request('?mode=rows&table=productions%22%3BDROP%20TABLE%20productions'), env)).status, 404);
assert.equal((await backupGET(request('?mode=rows&table=productions&offset=-1'), env)).status, 400);
assert.equal((await (await backupGET(request('?mode=files'), env)).json() as { cursor: string }).cursor, 'second');
assert.equal((await backupGET(request('?mode=file&key=hours/test&etag=changed'), env)).status, 409);
const object = await backupGET(request('?mode=file&key=hours/test&etag=v1'), env);
assert.deepEqual(new Uint8Array(await object.arrayBuffer()), new Uint8Array([1, 2, 3]));
assert.ok(statements.every(query => /^(SELECT|PRAGMA table_xinfo)/.test(query)));
assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM productions').get()!.n, 1);
sqlite.close(); restored.close();
console.log('PASS: exportação desativada por padrão, autenticação, expiração, SQL somente leitura, restauração exata de linha grande/NUL/BLOB e R2 condicional.');
