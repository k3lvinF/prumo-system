import { env } from 'cloudflare:workers';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { can, isAppRole, type AppRole, type Permission } from '@/lib/access-control';
import { getIndependentAuth } from '@/lib/independent-auth';

export type AppUser = {
  userId: string;
  displayName: string;
  email: string;
  fullName: string | null;
  role: AppRole;
};

export function independentAuthEnabled() {
  return env.AUTH_MODE === 'independent';
}

export async function getAppUser(permission?: Permission): Promise<AppUser | null> {
  if (!independentAuthEnabled()) {
    const user = await getChatGPTUser();
    return user ? { ...user, role: 'administrador' } : null;
  }

  const session = await getIndependentAuth().api.getSession({ headers: await headers() });
  if (!session?.user) return null;
  const record = session.user as typeof session.user & { role?: string; status?: string };
  const email = record.email.trim().toLowerCase();
  const isOwner = email === env.PRUMO_OWNER_EMAIL?.trim().toLowerCase();
  const role: AppRole = isOwner ? 'administrador' : isAppRole(record.role) ? record.role : 'pendente';
  if (!isOwner && record.status !== 'ativo') return null;
  if (permission && !can(role, permission)) return null;
  return { userId: record.id, displayName: record.name || email, email, fullName: record.name || null, role };
}

export async function requireAppUser(returnTo: string, permission?: Permission) {
  const user = await getAppUser(permission);
  if (user) return user;
  if (independentAuthEnabled()) redirect(`/login?returnTo=${encodeURIComponent(returnTo)}`);
  redirect(`/signin-with-chatgpt?return_to=${encodeURIComponent(returnTo)}`);
}
