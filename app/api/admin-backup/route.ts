import { env } from 'cloudflare:workers';
import { backupGET } from '@/lib/backup-api';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  return backupGET(request, env);
}
