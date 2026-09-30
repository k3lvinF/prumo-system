// Read-only, temporary administrator export. Disabled unless a short-lived
// runtime secret is configured. Never calls resolveOwner or rate-limit writes.
type BackupEnv = {
  DB?: D1Database;
  BUCKET?: R2Bucket;
  PRUMO_BACKUP_TOKEN?: string;
  PRUMO_BACKUP_UNTIL?: string;
};
type SchemaRow = { name: string; type: string; sql: string; tbl_name: string };
type Column = { name: string; pk: number; hidden: number };
const quoteIdentifier = (name: string) => '"' + name.replaceAll('"', '""') + '"';
const headers = {
  'Cache-Control': 'private, no-store, max-age=0',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Content-Security-Policy': "default-src 'none'; sandbox",
};
const json = (value: unknown, status = 200) => Response.json(value, { status, headers });

async function allowed(req: Request, env: BackupEnv) {
  const expiry = Date.parse(env.PRUMO_BACKUP_UNTIL ?? '');
  const remaining = expiry - Date.now();
  if (!env.PRUMO_BACKUP_TOKEN || env.PRUMO_BACKUP_TOKEN.length < 43 ||
      !Number.isFinite(remaining) || remaining <= 0 || remaining > 24 * 3600_000) return false;
  const supplied = req.headers.get('x-prumo-backup-token') ?? '';
  if (supplied.length > 256) return false;
  const hash = async (s: string) => new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)));
  const [a, b] = await Promise.all([hash(supplied), hash(env.PRUMO_BACKUP_TOKEN)]);
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a[i] ^ b[i];
  return difference === 0;
}

async function schema(db: D1Database) {
  const result = await db.prepare("SELECT name,type,sql,tbl_name FROM sqlite_schema WHERE sql IS NOT NULL ORDER BY type,name").all<SchemaRow>();
  return result.results.filter(row => !row.name.startsWith('sqlite_') && !row.name.startsWith('_cf_'));
}

export async function backupGET(req: Request, env: BackupEnv): Promise<Response> {
  if (!(await allowed(req, env))) return json({ error: 'Exportação indisponível.' }, 403);
  if (!env.DB || !env.BUCKET) return json({ error: 'Armazenamento indisponível.' }, 503);
  const params = new URL(req.url).searchParams;
  try {
    const mode = params.get('mode') ?? 'schema';
    if (mode === 'schema') {
      const objects = await schema(env.DB);
      if (objects.some(row => /CREATE\s+VIRTUAL\s+TABLE/i.test(row.sql))) {
        return json({ error: 'Tabela virtual requer exportação nativa.' }, 422);
      }
      const tables = [];
      for (const row of objects.filter(row => row.type === 'table')) {
        const count = await env.DB.prepare(`SELECT COUNT(*) AS n FROM ${quoteIdentifier(row.name)}`).first<{ n: number }>();
        tables.push({ name: row.name, count: count?.n ?? 0 });
      }
      return json({ format: 'prumo-logical-backup-v1', objects, tables });
    }
    if (mode === 'rows') {
      const name = params.get('table') ?? '';
      const offsetText = params.get('offset') ?? '0';
      if (!/^\d{1,10}$/.test(offsetText)) return json({ error: 'Página inválida.' }, 400);
      const objects = await schema(env.DB);
      if (!objects.some(row => row.type === 'table' && row.name === name)) return json({ error: 'Tabela inexistente.' }, 404);
      const table = quoteIdentifier(name);
      const info = await env.DB.prepare(`PRAGMA table_xinfo(${table})`).all<Column>();
      const columns = info.results.filter(column => column.hidden === 0);
      const primary = columns.filter(column => column.pk > 0).sort((a, b) => a.pk - b.pk);
      const order = primary.length ? primary.map(column => quoteIdentifier(column.name)).join(',') : 'rowid';
      // Return SQL literals, preserving numbers, NULL, Unicode, blobs and the
      // original JSON text. One row per request bounds memory for large records.
      const expressions = columns.map(column => {
        const col = quoteIdentifier(column.name);
        // quote(TEXT) truncates at NUL; encode TEXT bytes instead.
        return `CASE WHEN typeof(${col})='text' THEN 'CAST(X''' || hex(CAST(${col} AS BLOB)) || ''' AS TEXT)' ELSE quote(${col}) END`;
      });
      const rows = await env.DB.prepare(`SELECT ${expressions.join(',')} FROM ${table} ORDER BY ${order} LIMIT 1 OFFSET ?`).bind(Number(offsetText)).raw<string[]>();
      return json({ table: name, columns: columns.map(column => column.name), rows,
        nextOffset: rows.length ? Number(offsetText) + 1 : null });
    }
    if (mode === 'files') {
      const cursor = params.get('cursor') || undefined;
      if (cursor && cursor.length > 4096) return json({ error: 'Página inválida.' }, 400);
      const page = await env.BUCKET.list({ limit: 100, ...(cursor ? { cursor } : {}) });
      const objects = [];
      for (let start = 0; start < page.objects.length; start += 10) {
        const group = page.objects.slice(start, start + 10);
        const details = await Promise.all(group.map(object => env.BUCKET!.head(object.key)));
        if (details.some((object, index) => !object || object.etag !== group[index].etag)) {
          return json({ error: 'Arquivos alterados durante a listagem.' }, 409);
        }
        objects.push(...details);
      }
      return json({ objects, cursor: page.truncated ? page.cursor : null });
    }
    if (mode === 'file') {
      const key = params.get('key');
      const etag = params.get('etag');
      if (!key || !etag) return json({ error: 'Arquivo inválido.' }, 400);
      const object = await env.BUCKET.get(key, { onlyIf: { etagMatches: etag } });
      if (!object) return json({ error: 'Arquivo não encontrado.' }, 404);
      if (!('body' in object)) return json({ error: 'Arquivo alterado. Reinicie a cópia.' }, 409);
      return new Response(object.body, { headers: { ...headers, 'Content-Type': 'application/octet-stream',
        'Content-Disposition': 'attachment; filename="backup-object.bin"', 'ETag': object.httpEtag } });
    }
    return json({ error: 'Operação inválida.' }, 400);
  } catch {
    // Do not expose schema names, personal data or provider errors in logs.
    return json({ error: 'Falha na exportação. Nenhuma alteração foi executada.' }, 503);
  }
}
