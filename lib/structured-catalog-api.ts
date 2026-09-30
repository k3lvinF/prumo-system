import {boundedJSON,limited,mutationAllowed,resolveOwner,response,type Identity} from './production-api';
import {equipmentSchema,technicalSheetSchema} from './menu-catalog';

type DB={prepare:(sql:string)=>any;batch?:(statements:any[])=>Promise<any[]>};
const uuid=(value:unknown)=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const canonical=(value:unknown)=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().replace(/\s+/g,' ').toLocaleLowerCase('pt-BR');
const configs={technicalSheets:{table:'technical_sheets',schema:technicalSheetSchema,revisions:true},equipment:{table:'equipment',schema:equipmentSchema,revisions:false}} as const;

export function structuredCatalogHandlers<K extends keyof typeof configs>(db:DB,getUser:()=>Promise<Identity|null>,kind:K){
  const config=configs[kind];
  return {
    GET:async()=>{try{
      const user=await getUser();if(!user)return response({error:'Entre com sua conta para acessar.'},401);
      const owner=await resolveOwner(db,user);if(await limited(db,owner))return response({error:'Muitas solicitações. Aguarde um minuto.'},429);
      const rows=await db.prepare(`SELECT id,data,version,archived,updated${config.revisions?',updated_by':''} FROM ${config.table} WHERE owner=? ORDER BY archived,updated DESC`).bind(owner).all();
      return response((rows.results??[]).flatMap((row:any)=>{try{const parsed=config.schema.safeParse(JSON.parse(row.data));return parsed.success?[{...parsed.data,version:Number(row.version),revision:Number(row.version),archived:Boolean(row.archived),updatedAt:row.updated,updatedBy:row.updated_by??''}]:[]}catch{return[]}}));
    }catch{return response({error:'Não foi possível carregar o cadastro.',code:'db_error'},503)}},
    POST:async(req:Request)=>{try{
      const user=await getUser();if(!user)return response({error:'Entre com sua conta para salvar.'},401);
      if(!mutationAllowed(req))return response({error:'Solicitação não permitida.'},403);
      const owner=await resolveOwner(db,user);if(await limited(db,owner))return response({error:'Muitas solicitações. Aguarde um minuto.'},429);
      let body:any;try{body=await boundedJSON(req)}catch(error){return response({error:error instanceof Error&&error.message==='too_large'?'Cadastro acima do limite permitido.':'JSON inválido.',code:'invalid'},400)}
      const parsed=config.schema.safeParse(body?.data);if(!parsed.success)return response({error:'Confira os dados do cadastro.',code:'invalid'},400);
      const supplied=parsed.data as any,id=supplied.id;if(!uuid(id))return response({error:'Identificador inválido.',code:'invalid'},400);
      const old=await db.prepare(`SELECT version FROM ${config.table} WHERE id=? AND owner=?`).bind(id,owner).first();
      const expected=Number(body.version??supplied.version??old?.version??0);if(old&&expected!==Number(old.version))return response({error:'O cadastro mudou em outro acesso.',code:'conflict'},409);
      if(!old&&expected!==0)return response({error:'O cadastro não existe mais. Atualize a página.',code:'conflict'},409);
      if(kind==='equipment'&&!Boolean(supplied.archived)){
        const rows=await db.prepare('SELECT id,data FROM equipment WHERE owner=? AND archived=0 AND id<>?').bind(owner,id).all();
        const duplicate=(rows.results??[]).some((row:any)=>{try{const item=equipmentSchema.parse(JSON.parse(row.data));return canonical(item.name)===canonical(supplied.name)&&canonical(item.number)===canonical(supplied.number)}catch{return false}});
        if(duplicate)return response({error:'Esse utensílio ou equipamento já está cadastrado.',code:'duplicate'},409);
      }
      const now=new Date().toISOString(),version=(old?Number(old.version):0)+1,archived=Boolean(supplied.archived),updatedBy=user.email?.trim().toLowerCase()||user.userId;
      const data={...supplied,version,revision:version,archived,updatedAt:now,updatedBy};
      const name=String(data.name??data.preparation??'').trim(),category=String(data.category??'Preparo').trim(),serialized=JSON.stringify(data);
      const write=old
        ?db.prepare(`UPDATE ${config.table} SET name=?,category=?,data=?,version=?,archived=?,updated=?${config.revisions?',updated_by=?':''} WHERE id=? AND owner=? AND version=?`).bind(name,category,serialized,version,archived?1:0,now,...(config.revisions?[updatedBy]:[]),id,owner,expected)
        :db.prepare(`INSERT INTO ${config.table}(id,owner,name,category,data,version,archived,updated${config.revisions?',updated_by':''}) VALUES(?,?,?,?,?,?,?,?${config.revisions?',?':''})`).bind(id,owner,name,category,serialized,version,archived?1:0,now,...(config.revisions?[updatedBy]:[]));
      const statements=[write];
      if(config.revisions)statements.push(db.prepare('INSERT INTO technical_sheet_revisions(id,sheet_id,owner,revision,data,at,account) SELECT ?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM technical_sheets WHERE id=? AND owner=? AND version=? AND updated=?)').bind(crypto.randomUUID(),id,owner,version,serialized,now,updatedBy,id,owner,version,now));
      const results=db.batch?await db.batch(statements):[await write.run(),...(config.revisions?[await statements[1].run()]:[])];
      if(!results[0]?.meta.changes||config.revisions&&!results[1]?.meta.changes)return response({error:'Conflito de gravação.',code:'conflict'},409);
      return response(data);
    }catch{return response({error:'Não foi possível salvar o cadastro.',code:'db_error'},503)}}
  };
}
