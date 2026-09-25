import type {Production} from './uan';
const equal=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
/** Three-way merge: unchanged local fields never overwrite newer server fields. */
export function mergeProduction(base:Production,local:Production,remote:Production,replaceConflicts=false):Production {
 const merge=(b:any,l:any,r:any,path:string):any=>{
  if(equal(l,b)||equal(l,r))return r;
  if(equal(r,b))return l;
  if(!b&&l&&r&&l.id===r.id&&equal({...l,created:null},{...r,created:null}))return r;
  if(Array.isArray(b)&&Array.isArray(l)&&Array.isArray(r)&&[...b,...l,...r].every(x=>x&&typeof x.id==='string')){
   const bm=new Map(b.map(x=>[x.id,x])),lm=new Map(l.map(x=>[x.id,x])),rm=new Map(r.map(x=>[x.id,x]));
   return [...new Set([...rm.keys(),...lm.keys()])].map(id=>merge(bm.get(id),lm.get(id),rm.get(id),path+'.'+id)).filter(x=>x!==undefined);
  }
  if(b&&l&&r&&!Array.isArray(b)&&typeof b==='object'&&typeof l==='object'&&typeof r==='object')return Object.fromEntries([...new Set([...Object.keys(b),...Object.keys(l),...Object.keys(r)])].map(k=>[k,merge(b[k],l[k],r[k],path+'.'+k)]));
  if(replaceConflicts)return l;
  throw Error('Campo alterado em outro acesso: '+path+'\nValor salvo: '+JSON.stringify(r)+'\nSua alteração: '+JSON.stringify(l));
 };
 return {...merge({...base,audit:[],version:0},{...local,audit:[],version:0},{...remote,audit:[],version:0},'produção'),version:remote.version,audit:remote.audit};
}
