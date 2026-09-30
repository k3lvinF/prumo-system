import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, mkdtempSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';

mkdirSync('work', { recursive: true });
const root = mkdtempSync(resolve('work/backup-test-'));
const loaderIndex = process.execArgv.indexOf('--import');
const loader = loaderIndex >= 0 ? process.execArgv[loaderIndex + 1] : 'tsx';
function collect(name: string, changed = false) {
  return execFileSync(process.execPath, ['--import', loader, '--import', './tests/fixtures/backup-fetch.ts',
    'scripts/collect-site-backup.mjs', 'https://backup.invalid', resolve(root, name)], {
    input: JSON.stringify({ siteToken: 'synthetic', backupToken: 'a'.repeat(64) }) + '\n',
    env: { ...process.env, BACKUP_TEST_CHANGE: changed ? '1' : '0' }, stdio: ['pipe', 'pipe', 'pipe'],
  });
}
collect('valid');
const manifest = JSON.parse(readFileSync(resolve(root, 'valid/manifest.json'), 'utf8'));
assert.equal(manifest.complete, true);
assert.equal(manifest.atomicSnapshot, false);
assert.equal(manifest.tables.productions.count, 1);
assert.equal(manifest.tables.hour_evidence.count, 0);
assert.equal(manifest.tables.request_limits.excluded, true);
assert.equal(manifest.tables.request_limits.count, 0);
assert.deepEqual(manifest.excludedVolatileTables, ['request_limits']);
assert.equal(manifest.files.length, 1);
assert.match(manifest.files[0].filename, /^[a-f0-9]{64}\.bin$/);
const bytes = readFileSync(resolve(root, 'valid/objects', manifest.files[0].filename));
assert.deepEqual([...bytes], [1, 2, 3]);
assert.equal(manifest.files[0].sha256, createHash('sha256').update(bytes).digest('hex'));
const restored = new DatabaseSync(':memory:');
restored.exec(readFileSync(resolve(root, 'valid/d1.sql'), 'utf8'));
assert.equal(restored.prepare('SELECT data FROM productions').get()!.data, "ação 'teste'\0fim");
restored.close();
assert.throws(() => collect('changed', true));
assert.equal(JSON.parse(readFileSync(resolve(root, 'changed/manifest.json'), 'utf8')).complete, false);
assert.throws(() => collect('valid')); // Never overwrite an existing backup.
console.log('PASS: coleta completa, restauração SQL, hashes R2, caminhos seguros, mudança concorrente e proteção contra sobrescrita.');
