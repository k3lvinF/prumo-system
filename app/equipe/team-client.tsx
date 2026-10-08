'use client';
import { useEffect, useState } from 'react';
import { selectableRoles, type AppRole } from '@/lib/access-control';
import './team.css';

type Member = { id: string; name: string; email: string; emailVerified: number | boolean; requestedRole: string; role: AppRole; status: string; createdAt: number };

export default function TeamClient() {
  const [members, setMembers] = useState<Member[]>([]);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  async function load() {
    const response = await fetch('/api/team', { cache: 'no-store' });
    const body = await response.json() as Member[] | { error?: string };
    if (!response.ok) throw Error(!Array.isArray(body) && body.error || 'Não foi possível carregar a equipe.');
    if (!Array.isArray(body)) throw Error('Resposta inválida da equipe.');
    setMembers(body);
  }

  useEffect(() => { load().catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Não foi possível carregar a equipe.')); }, []);

  async function update(member: Member, role: AppRole, status: string) {
    setBusy(member.id); setError('');
    try {
      const response = await fetch('/api/team', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: member.id, role, status }) });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw Error(body.error || 'Não foi possível atualizar.');
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível atualizar.');
    } finally { setBusy(''); }
  }

  return <main className="team-page"><header><div><p>ADMINISTRAÇÃO</p><h1>Equipe e acessos</h1><span>Aprove cadastros e limite cada pessoa à função necessária.</span></div><a href="/">Voltar ao sistema</a></header>{error && <div className="team-error">{error}</div>}<section className="team-list">{members.map((member) => {
    const proposedRole = (selectableRoles.some((role) => role.value === member.requestedRole) ? member.requestedRole : 'consulta') as AppRole;
    const selectedRole = member.role === 'pendente' ? proposedRole : member.role;
    return <article key={member.id}><div className="team-person"><span>{member.name.slice(0, 1).toUpperCase()}</span><div><strong>{member.name}</strong><small>{member.email}</small></div></div><div><small>Função solicitada</small><strong>{selectableRoles.find((role) => role.value === member.requestedRole)?.label ?? member.requestedRole}</strong></div><label>Função aprovada<select value={selectedRole} disabled={busy === member.id} onChange={(event) => update(member, event.target.value as AppRole, 'ativo')}>{selectableRoles.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}<option value="administrador">Administrador(a)</option></select></label><div className="team-actions"><button disabled={busy === member.id} onClick={() => update(member, selectedRole, 'ativo')}>Aprovar</button><button className="secondary" disabled={busy === member.id} onClick={() => update(member, selectedRole, 'suspenso')}>Suspender</button></div><span className={'team-status ' + member.status}>{member.status === 'ativo' ? 'Ativo' : member.status === 'suspenso' ? 'Suspenso' : 'Aguardando aprovação'}</span></article>;
  })}{!members.length && !error && <p className="team-empty">Nenhum cadastro encontrado.</p>}</section></main>;
}
