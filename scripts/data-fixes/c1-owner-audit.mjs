import {DatabaseSync} from 'node:sqlite';
import {mkdir,writeFile} from 'node:fs/promises';
import {argument} from './lib.mjs';

const dbPath=argument('--db');if(!dbPath)throw new Error('Informe --db <arquivo SQLite restaurado>.');
const db=new DatabaseSync(dbPath),rows=db.prepare('SELECT id,owner,data FROM productions').all(),findings=[];
for(const row of rows){
  try{
    const data=JSON.parse(row.data),accounts=[...new Set((data.audit??[]).map(item=>String(item.account??'').trim().toLowerCase()).filter(Boolean))];
    if(accounts.length&&!accounts.includes(String(row.owner).toLowerCase()))findings.push({id:String(row.id).slice(0,8),accounts:accounts.length,ambiguous:accounts.length!==1});
  }catch{findings.push({id:String(row.id).slice(0,8),invalidJson:true})}
}
await mkdir('reports/data-fixes',{recursive:true});const report=`reports/data-fixes/${new Date().toISOString().slice(0,10)}-c1-owner-audit.md`;
await writeFile(report,['# Auditoria C1 de proprietários','',...findings.map(x=>`- ${x.id}: ${x.invalidJson?'JSON inválido':`${x.accounts} conta(s) no histórico${x.ambiguous?' — revisão manual':''}`}`)].join('\n')+'\n');db.close();console.log(`Somente leitura: ${report}`);
