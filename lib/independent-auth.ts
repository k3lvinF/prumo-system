import { env } from 'cloudflare:workers';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { getDb } from '@/db';
import * as schema from '@/db/schema';

async function sendAuthEmail(to: string, subject: string, text: string) {
  if (!env.RESEND_API_KEY || !env.AUTH_EMAIL_FROM) throw new Error('Serviço de e-mail não configurado.');
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: env.AUTH_EMAIL_FROM, to: [to], subject, text }),
  });
  if (!response.ok) throw new Error(`Falha no envio de e-mail (${response.status}).`);
}

function createIndependentAuth() {
  if (!env.BETTER_AUTH_SECRET || !env.BETTER_AUTH_URL) throw new Error('Autenticação independente não configurada.');
  return betterAuth({
    appName: 'PRUMO SYSTEM',
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(getDb(), { provider: 'sqlite', schema }),
    trustedOrigins: [env.BETTER_AUTH_URL],
    emailAndPassword: {
      enabled: true,
      autoSignIn: false,
      requireEmailVerification: true,
      minPasswordLength: 12,
      maxPasswordLength: 128,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, url }) => {
        await sendAuthEmail(user.email, 'Redefinição de senha — PRUMO SYSTEM', `Use este link para criar uma nova senha:\n\n${url}\n\nSe você não solicitou a alteração, ignore esta mensagem.`);
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: false,
      sendVerificationEmail: async ({ user, url }) => {
        await sendAuthEmail(user.email, 'Confirme seu cadastro — PRUMO SYSTEM', `Confirme seu e-mail para concluir o cadastro:\n\n${url}\n\nDepois da confirmação, seu acesso será liberado conforme a função aprovada pelo administrador.`);
      },
    },
    user: {
      additionalFields: {
        requestedRole: { type: 'string', required: true, input: true },
        role: { type: 'string', required: false, defaultValue: 'pendente', input: false },
        status: { type: 'string', required: false, defaultValue: 'pendente', input: false },
      },
    },
    rateLimit: { enabled: true, window: 60, max: 60 },
  });
}

let instance: ReturnType<typeof createIndependentAuth> | undefined;

export function getIndependentAuth(): ReturnType<typeof createIndependentAuth> {
  if (!instance) instance = createIndependentAuth();
  return instance;
}
