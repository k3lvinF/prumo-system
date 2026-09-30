import {DatabaseSync} from 'node:sqlite';
import {mkdir,writeFile} from 'node:fs/promises';

const safeName=value=>{if(!/^[a-z0-9_]+$/i.test(value))throw new Error('Identificador SQL inválido.');return value};
export async function runFix({name,dbPath,select,transform,apply=process.argv.includes('--apply')}){
  if(!dbPath)throw new Error('Informe --db <arquivo SQLite restaurado>.');
  const db=new DatabaseSync(dbPath),rows=db.prepare(select).all(),changes=rows.map(transform).filter(Boolean),date=new Date().toISOString().slice(0,10);
  await mkdir('reports/data-fixes',{recursive:true});
  const lines=[`# ${name}`,``,`${changes.length} alteração(ões) candidata(s).`,``,...changes.map(change=>`- ${String(change.rowId).slice(0,8)} · ${change.table}.${change.field}: ${JSON.stringify(change.before)} → ${JSON.stringify(change.after)}`)];
  const report=`reports/data-fixes/${date}-${name}.md`;await writeFile(report,lines.join('\n')+'\n');
  if(!apply){console.log(`Dry-run concluído: ${report}`);db.close();return{report,affected:changes.length}}
  for(let offset=0;offset<changes.length;offset+=50)for(const change of changes.slice(offset,offset+50)){
    const table=safeName(change.table),field=safeName(change.field);db.exec('BEGIN IMMEDIATE');try{db.prepare('INSERT INTO data_fix_log(id,fix,table_name,row_id,field,before,after,at) VALUES(?,?,?,?,?,?,?,?)').run(crypto.randomUUID(),name,table,change.rowId,field,JSON.stringify(change.before),JSON.stringify(change.after),new Date().toISOString());db.prepare(`UPDATE ${table} SET ${field}=? WHERE id=?`).run(typeof change.after==='string'?change.after:JSON.stringify(change.after),change.rowId);db.exec('COMMIT')}catch(error){db.exec('ROLLBACK');throw error}}
  db.prepare('INSERT INTO system_events(id,event,affected,at) VALUES(?,?,?,?)').run(crypto.randomUUID(),name,changes.length,new Date().toISOString());db.close();console.log(`Aplicação concluída: ${changes.length} linha(s).`);return{report,affected:changes.length};
}

export function argument(name){const index=process.argv.indexOf(name);return index>=0?process.argv[index+1]:undefined}
