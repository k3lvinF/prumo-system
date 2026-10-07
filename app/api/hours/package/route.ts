import {env} from 'cloudflare:workers';
import {getAppUser} from '@/app/app-auth';
import {limited,resolveOwner,response} from '@/lib/production-api';
import {makeHoursReport} from '@/lib/hours-report';
import {bytesStream,zipStream} from '@/lib/hours-zip';

const MAX_FILES=60_000,MAX_ZIP_BYTES=2_000_000_000,MAX_MONTH_BYTES=3_900_000_000,HEAD_CONCURRENCY=10;
const weekOf=(millis:number)=>Math.floor((Number(new Intl.DateTimeFormat('en-CA',{timeZone:'America/Bahia',day:'2-digit'}).format(new Date(millis)))-1)/7)+1;
async function mapLimit<T,R>(items:T[],limit:number,work:(item:T)=>Promise<R>){const result=new Array<R>(items.length);let cursor=0;await Promise.all(Array.from({length:Math.min(limit,items.length)},async()=>{while(cursor<items.length){const index=cursor++;result[index]=await work(items[index])}}));return result}

export async function GET(req:Request){try{
  const u=await getAppUser();if(!u)return response({error:'Acesso não autorizado.'},401);if(!env.DB||!env.BUCKET)return response({error:'Armazenamento indisponível.'},503);
  const db=env.DB,bucket=env.BUCKET;
  const url=new URL(req.url),id=url.searchParams.get('id'),partText=url.searchParams.get('part'),part=partText===null?null:Number(partText),owner=await resolveOwner(db,u);
  if(!id||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)||part!==null&&(!Number.isInteger(part)||part<1||part>5))return response({error:'Arquivo mensal não encontrado.'},404);
  if(await limited(db,owner))return response({error:'Muitas solicitações. Aguarde um minuto.'},429);
  const a=await db.prepare('SELECT month,at,data FROM hour_archives WHERE id=? AND owner=?').bind(id,owner).first<any>();if(!a)return response({error:'Arquivo mensal não encontrado.'},404);
  const s=JSON.parse(a.data),wanted=new Set<string>(s.evidence.map((e:{id:string})=>e.id)),periodStarts=new Map<string,number>(s.periods.map((p:{id:string;start:number})=>[p.id,p.start]));
  const rows=await db.prepare('SELECT id,period,key,name,size FROM hour_evidence WHERE owner=?').bind(owner).all<{id:string;period:string;key:string;name:string;size:number}>();
  const allFiles=rows.results.filter(file=>wanted.has(file.id));if(allFiles.length!==wanted.size||allFiles.some(file=>!periodStarts.has(file.period)))return response({error:'Os comprovantes do arquivo mensal estão incompletos.'},503);if(allFiles.length>MAX_FILES)return response({error:'O mês excede o limite seguro de 60.000 comprovantes por arquivo.',code:'too_many_files'},413);
  const inspected=await mapLimit(allFiles,HEAD_CONCURRENCY,async file=>({file,object:await bucket.head(file.key)}));if(inspected.some(item=>!item.object))return response({error:'Um comprovante está indisponível. Tente novamente.'},503);
  const total=inspected.reduce((sum,item)=>sum+(item.object?.size??item.file.size??0),0);if(total>MAX_MONTH_BYTES)return response({error:'Os comprovantes do mês ultrapassam 3,9 GB e precisam ser exportados em outro formato.',code:'month_too_large'},413);
  const weekFiles=part===null?allFiles:allFiles.filter(file=>weekOf(periodStarts.get(file.period)??0)===part),selectedBytes=weekFiles.reduce((sum,file)=>sum+(file.size??0),0);
  if(part===null&&total>MAX_ZIP_BYTES)return response({error:'O pacote ultrapassa 2 GB. Baixe em partes semanais usando o parâmetro part de 1 a 5.',code:'parts_required',parts:[1,2,3,4,5].filter(week=>allFiles.some(file=>weekOf(periodStarts.get(file.period)??0)===week))},413);
  if(selectedBytes>MAX_ZIP_BYTES)return response({error:'Esta parte semanal ultrapassa 2 GB.',code:'part_too_large'},413);if(part!==null&&!weekFiles.length)return response({error:'Esta parte semanal não possui comprovantes.',code:'empty_part'},404);
  const pdf=new Uint8Array(makeHoursReport(s,a.at).output('arraybuffer')),json=new TextEncoder().encode(a.data),suffix=part===null?'':'-parte-'+part;
  async function* source(){yield {name:'PRUMO-horas-'+a!.month+'.pdf',stream:bytesStream(pdf)};yield {name:'registros.json',stream:bytesStream(json)};for(const file of weekFiles){const object=await bucket.get(file.key);if(!object)throw Error('Comprovante indisponível');yield {name:'comprovantes/'+file.id+'-'+file.name,stream:object.body}}}
  return new Response(zipStream(source()),{headers:{'Content-Type':'application/zip','Content-Disposition':'attachment; filename="PRUMO-horas-'+a.month+suffix+'.zip"','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
}catch{return response({error:'Não foi possível preparar o pacote do mês.'},503)}}
