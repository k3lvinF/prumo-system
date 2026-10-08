'use client';
import {useState} from 'react';
import {authClient} from '@/lib/auth-client';
import {selectableRoles} from '@/lib/access-control';
import './login.css';

export default function LoginForm({returnTo='/'}:{returnTo?:string}){
  const [mode,setMode]=useState<'login'|'cadastro'>('login'),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
  async function submit(event:React.FormEvent<HTMLFormElement>){event.preventDefault();setBusy(true);setMessage('');const form=new FormData(event.currentTarget),email=String(form.get('email')??'').trim(),password=String(form.get('password')??'');
    try{
      if(mode==='login'){
        const result=await authClient.signIn.email({email,password});
        if(result.error)throw Error(result.error.message);
        window.location.assign(returnTo.startsWith('/')&&!returnTo.startsWith('//')?returnTo:'/');
      }else{
        const name=String(form.get('name')??'').trim(),requestedRole=String(form.get('requestedRole')??'');
        const result=await (authClient.signUp.email as any)({email,password,name,requestedRole,callbackURL:'/login?verified=1'});
        if(result.error)throw Error(result.error.message);
        setMessage('Cadastro recebido. Confirme o link enviado ao seu e-mail. Depois, o administrador aprovará sua função.');
        event.currentTarget.reset();
      }
    }catch(error){setMessage(error instanceof Error?error.message:'Não foi possível concluir. Tente novamente.')}finally{setBusy(false)}
  }
  return <main className="login-page"><section className="login-intro"><div className="login-mark">P</div><p className="login-kicker">PRUMO SYSTEM</p><h1>Produção sob controle, com acesso por responsabilidade.</h1><p>Registros operacionais, fichas técnicas, custos, horas e supervisão em um ambiente protegido.</p><div className="login-points"><span>Dados preservados</span><span>Acesso individual</span><span>Histórico auditável</span></div></section><section className="login-card"><div className="login-tabs"><button className={mode==='login'?'active':''} onClick={()=>{setMode('login');setMessage('')}}>Entrar</button><button className={mode==='cadastro'?'active':''} onClick={()=>{setMode('cadastro');setMessage('')}}>Criar conta</button></div><div><p className="login-kicker">ACESSO SEGURO</p><h2>{mode==='login'?'Acesse sua área':'Solicite seu acesso'}</h2><p className="login-help">{mode==='login'?'Use o e-mail cadastrado.':'Informe seus dados reais. A função será validada pelo administrador.'}</p></div><form onSubmit={submit}>{mode==='cadastro'&&<label>Nome completo<input name="name" autoComplete="name" required maxLength={120}/></label>}<label>E-mail<input name="email" type="email" autoComplete="email" required maxLength={254}/></label><label>Senha<input name="password" type="password" autoComplete={mode==='login'?'current-password':'new-password'} minLength={12} maxLength={128} required/><small>Mínimo de 12 caracteres.</small></label>{mode==='cadastro'&&<label>Função solicitada<select name="requestedRole" required defaultValue=""><option value="" disabled>Selecione</option>{selectableRoles.map(role=><option key={role.value} value={role.value}>{role.label}</option>)}</select></label>}{message&&<p className="login-message" role="status">{message}</p>}<button className="login-submit" disabled={busy}>{busy?'Aguarde…':mode==='login'?'Entrar no sistema':'Criar minha conta'}</button></form><p className="login-security">O cadastro usa confirmação por e-mail. Permissões administrativas nunca são concedidas automaticamente.</p></section></main>
}
