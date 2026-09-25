'use client';
import {useState} from 'react';
import {Button} from '@/components/ui/button';
import {Checkbox} from '@/components/ui/checkbox';
import {audienceLabel,type MenuAudience,type MenuCatalog} from '@/lib/menu-catalog';
import {toast} from 'sonner';

export default function MenuCatalogPanel({catalog,busy,onSave}:{catalog:MenuCatalog;busy:boolean;onSave:(next:MenuCatalog)=>Promise<boolean>}){
 const [prepName,setPrepName]=useState(''),[menuName,setMenuName]=useState(''),[audience,setAudience]=useState<MenuAudience>('campo'),[selected,setSelected]=useState<string[]>([]);
 async function addPreparation(e:React.FormEvent){e.preventDefault();const name=prepName.trim().replace(/\s+/g,' ');if(!name)return;if(catalog.preparations.some(x=>x.toLocaleLowerCase('pt-BR')===name.toLocaleLowerCase('pt-BR')))return toast.error('Essa preparação já está cadastrada.');if(await onSave({...catalog,preparations:[...catalog.preparations,name]})){setPrepName('');toast.success('Preparação adicionada ao catálogo.')}}
 async function addMenu(e:React.FormEvent){e.preventDefault();const name=menuName.trim().replace(/\s+/g,' ');if(!name||!selected.length)return toast.error('Informe o nome e marque pelo menos um item.');if(await onSave({...catalog,menus:[...catalog.menus,{id:crypto.randomUUID(),name,audience,items:selected}]})){setMenuName('');setSelected([]);toast.success('Cardápio salvo.')}}
 return <section className="panel menu-manager"><div className="panel-title"><div><h3>Preparações e cardápios</h3><p className="muted">Este catálogo fica disponível em todas as produções.</p></div></div>
 <form onSubmit={addPreparation}><label className="field"><span>Cadastrar outra preparação</span><input value={prepName} onChange={e=>setPrepName(e.target.value)} maxLength={160} placeholder="Ex.: carne bovina ao molho"/></label><Button type="submit" variant="outline" disabled={busy}>Adicionar preparação</Button></form>
 <div className="catalog-chips">{catalog.preparations.map(item=><span key={item}>{item}</span>)}</div>
 <form onSubmit={addMenu} className="menu-form"><div className="grid2"><label className="field"><span>Nome do cardápio</span><input value={menuName} onChange={e=>setMenuName(e.target.value)} maxLength={160} placeholder="Ex.: Segunda-feira — opção 1"/></label><label className="field"><span>Tipo de cardápio</span><select value={audience} onChange={e=>setAudience(e.target.value as MenuAudience)}><option value="campo">Campo</option><option value="adm">Administrativo</option><option value="dietas">Dietas especiais/restritivas</option></select></label></div>
 <p className="field-label">Itens que compõem o cardápio</p><div className="menu-checks">{catalog.preparations.map(item=><label className="tick" key={item}><Checkbox checked={selected.includes(item)} onCheckedChange={checked=>setSelected(old=>checked===true?[...old,item]:old.filter(x=>x!==item))}/><span>{item}</span></label>)}</div><Button type="submit" disabled={busy}>Salvar cardápio</Button></form>
 <div className="saved-menus"><h4>Cardápios cadastrados</h4>{catalog.menus.length===0?<p className="muted">Nenhum cardápio cadastrado ainda.</p>:catalog.menus.map(menu=><article key={menu.id}><div><strong>{menu.name}</strong><small>{audienceLabel(menu.audience)} · {menu.items.join(', ')}</small></div><Button type="button" variant="ghost" disabled={busy} onClick={async()=>{if(window.confirm('Remover este cardápio do catálogo? As pesagens já feitas não serão alteradas.'))await onSave({...catalog,menus:catalog.menus.filter(x=>x.id!==menu.id)})}}>Remover</Button></article>)}</div>
 </section>;
}
