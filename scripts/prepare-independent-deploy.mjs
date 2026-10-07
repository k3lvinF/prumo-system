import { readFile, writeFile } from 'node:fs/promises';

const required = ['CLOUDFLARE_D1_DATABASE_ID', 'CLOUDFLARE_R2_BUCKET_NAME', 'BETTER_AUTH_URL', 'PRUMO_OWNER_EMAIL', 'AUTH_EMAIL_FROM'];
const missing = required.filter((name) => !process.env[name]?.trim());
if (missing.length) throw new Error(`Variáveis obrigatórias ausentes: ${missing.join(', ')}`);

const source = 'dist/server/wrangler.json';
const target = 'dist/server/wrangler.production.json';
const config = JSON.parse(await readFile(source, 'utf8'));
config.name = process.env.CLOUDFLARE_WORKER_NAME?.trim() || 'prumo-system';
config.d1_databases = [{
  binding: 'DB',
  database_name: process.env.CLOUDFLARE_D1_DATABASE_NAME?.trim() || 'prumo-production',
  database_id: process.env.CLOUDFLARE_D1_DATABASE_ID.trim(),
  migrations_dir: '../../drizzle',
}];
config.r2_buckets = [{ binding: 'BUCKET', bucket_name: process.env.CLOUDFLARE_R2_BUCKET_NAME.trim() }];
config.vars = {
  ...(config.vars || {}),
  AUTH_MODE: 'independent',
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL.trim().replace(/\/$/, ''),
  AUTH_EMAIL_FROM: process.env.AUTH_EMAIL_FROM.trim(),
  PRUMO_OWNER_EMAIL: process.env.PRUMO_OWNER_EMAIL.trim().toLowerCase(),
  PRUMO_WORKSPACE_OWNER: process.env.PRUMO_WORKSPACE_OWNER?.trim().toLowerCase() || process.env.PRUMO_OWNER_EMAIL.trim().toLowerCase(),
  HOURS_CONTACT_OWNER: process.env.HOURS_CONTACT_OWNER?.trim().toLowerCase() || process.env.PRUMO_OWNER_EMAIL.trim().toLowerCase(),
};
if (process.env.PRUMO_DOMAIN?.trim()) config.routes = [{ pattern: process.env.PRUMO_DOMAIN.trim(), custom_domain: true }];
await writeFile(target, `${JSON.stringify(config, null, 2)}\n`);
console.log(`Configuração independente criada em ${target}.`);
