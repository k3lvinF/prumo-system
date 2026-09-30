// Synthetic transport for the collector integration test. No network or real data.
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { backupGET } from '../../lib/backup-api';
const db = new DatabaseSync(':memory:');
db.exec('CREATE TABLE productions(id TEXT PRIMARY KEY, data TEXT); CREATE TABLE hour_evidence(id TEXT PRIMARY KEY);');
db.prepare('INSERT INTO productions VALUES(?,?)').run('sample', "ação 'teste'\0fim");
let schemaRequests = 0;
function prepare(query: string) {
  let values: SQLInputValue[] = [];
  return {
    bind(...args: SQLInputValue[]) { values = args; return this; },
    async all() { return { results: db.prepare(query).all(...values) }; },
    async first() { return db.prepare(query).get(...values) ?? null; },
    async raw() { const statement = db.prepare(query); statement.setReturnArrays(true); return statement.all(...values); },
  };
}
const object = { key: 'hours/../../outside', size: 3, etag: 'version1', httpMetadata: { contentType: 'application/pdf' }, customMetadata: { source: 'synthetic' } };
const env = {
  DB: { prepare } as unknown as D1Database,
  BUCKET: {
    async list() { return { objects: [object], truncated: false }; },
    async head() { return object; },
    async get() { return { ...object, body: new Response(new Uint8Array([1, 2, 3])).body, httpEtag: '"version1"' }; },
  } as unknown as R2Bucket,
  PRUMO_BACKUP_TOKEN: 'a'.repeat(64), PRUMO_BACKUP_UNTIL: new Date(Date.now() + 3600_000).toISOString(),
};
globalThis.fetch = async (input, init) => {
  const request = new Request(input, init);
  const url = new URL(request.url);
  if (url.origin !== 'https://backup.invalid') throw Error('Unexpected origin');
  if (url.searchParams.get('mode') === 'schema' && ++schemaRequests === 2 && process.env.BACKUP_TEST_CHANGE === '1') {
    db.prepare('UPDATE productions SET data=? WHERE id=?').run('changed', 'sample');
  }
  return backupGET(request, env);
};
