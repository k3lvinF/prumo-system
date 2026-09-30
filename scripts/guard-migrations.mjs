import {readdir,readFile} from 'node:fs/promises';

const files=(await readdir('drizzle')).filter(name=>/^\d+.*\.sql$/.test(name)).sort();
const newFiles=files.filter(name=>Number(name.slice(0,4))>=8);
const forbidden=[/\bDELETE\s+FROM\b/i,/\bDROP\s+TABLE\b/i,/\bDROP\s+COLUMN\b/i];
for(const file of newFiles){
  const sql=(await readFile('drizzle/'+file,'utf8')).replace(/--.*$/gm,'');
  for(const rule of forbidden)if(rule.test(sql))throw new Error(`Migração insegura: ${file} (${rule})`);
  for(const statement of sql.split('--> statement-breakpoint'))if(/^\s*UPDATE\s+/i.test(statement)&&!(/\bWHERE\b/i.test(statement)))throw new Error(`Migração insegura: ${file} (UPDATE sem WHERE)`);
}
console.log(`${newFiles.length} migração(ões) nova(s) verificada(s).`);
