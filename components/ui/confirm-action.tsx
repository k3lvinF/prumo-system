'use client';
import {useRef,useState} from 'react';
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle} from './dialog';
import {Button} from './button';

type Pending={title:string;message:string;confirmLabel:string};
export function useConfirmAction(){
  const [pending,setPending]=useState<Pending|null>(null),resolver=useRef<((value:boolean)=>void)|null>(null);
  const confirm=(message:string,title='Confirmar alteração',confirmLabel='Continuar')=>new Promise<boolean>(resolve=>{resolver.current=resolve;setPending({title,message,confirmLabel})});
  const finish=(value:boolean)=>{resolver.current?.(value);resolver.current=null;setPending(null)};
  const dialog=<Dialog open={!!pending} onOpenChange={open=>{if(!open)finish(false)}}><DialogContent><DialogHeader><DialogTitle>{pending?.title}</DialogTitle><DialogDescription>{pending?.message}</DialogDescription></DialogHeader><div className="panel-actions"><Button type="button" variant="outline" onClick={()=>finish(false)}>Cancelar</Button><Button type="button" onClick={()=>finish(true)}>{pending?.confirmLabel}</Button></div></DialogContent></Dialog>;
  return{confirm,dialog};
}
