'use client';
import {useState} from 'react';
import {Button} from '@/components/ui/button';
import {Checkbox} from '@/components/ui/checkbox';
import {audienceLabel,type MenuAudience,type MenuCatalog} from '@/lib/menu-catalog';
import {toast} from 'sonner';

export default function MenuCatalogPanel({catalog,busy,onSave}:{catalog:MenuCatalog;busy:boolean;onSave:(next:MenuCatalog)=>Promise<boolean>}){
 const [menuName,setMenuName]=useState(''),[audience,setAudience]=useState<MenuAudience>('campo'),[selected,setSelected]=useState<string[]>([]);
 async function addMenu(e:React.FormEvent){e.preventDefault();const name=menuName.trim().replace(/\s+/g,' ');if(!name||!selected.length)return toast.error('Informe o nome e marque pelo menos um item.');if(await onSave({...catalog,menus:[...catalog.menus,{id:crypto.randomUUID(),name,audience,items:selected}]})){setMenuName('');setSelected([]);toast.success('Cardápio salvo.')}}
 return <section className="panel menu-manager"><div className="panel-title"><div><h3>Cardápios</h3><p className="muted">Os preparos disponíveis vêm das Fichas técnicas.</p></div></div>
 <form onSubmit={addMenu} className="menu-form"><div className="grid2"><label className="field"><span>Nome do cardápio</span><input value={menuName} onChange={e=>setMenuName(e.target.value)} maxLength={160} placeholder="Ex.: Segunda-feira — opção 1"/></label><label className="field"><span>Tipo de cardápio</span><select value={audience} onChange={e=>setAudience(e.target.value as MenuAudience)}><option value="campo">Campo</option><option value="adm">Administrativo</option><option value="dietas">Dietas especiais/restritivas</option></select></label></div>
 <p className="field-label">Itens que compõem o cardápio</p><div className="menu-checks">{catalog.preparations.map(item=><label className="tick" key={item}><Checkbox checked={selected.includes(item)} onCheckedChange={checked=>setSelected(old=>checked===true?[...old,item]:old.filter(x=>x!==item))}/><span>{item}</span></label>)}</div><Button type="submit" disabled={busy}>Salvar cardápio</Button></form>
 <div className="saved-menus"><h4>Cardápios cadastrados</h4>{catalog.menus.length===0?<p className="muted">Nenhum cardápio cadastrado ainda.</p>:catalog.menus.map(menu=><article key={menu.id}><div><strong>{menu.name}</strong><small>{audienceLabel(menu.audience)} · {menu.items.join(', ')}</small></div><Button type="button" variant="ghost" disabled={busy} onClick={async()=>{if(window.confirm('Remover este cardápio do catálogo? As pesagens já feitas não serão alteradas.'))await onSave({...catalog,menus:catalog.menus.filter(x=>x.id!==menu.id)})}}>Remover</Button></article>)}</div>
 </section>;
}
