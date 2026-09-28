import {readdir,readFile} from 'node:fs/promises';

const files=(await readdir('drizzle')).filter(name=>/^\d+.*\.sql$/.test(name)).sort();
const newFiles=files.filter(name=>Number(name.slice(0,4))>=8);
const forbidden=[/\bDELETE\s+FROM\b/i,/\bDROP\s+TABLE\b/i,/\bDROP\s+COLUMN\b/i,/\bUPDATE\b(?![\s\S]*\bWHERE\b)/i];
for(const file of newFiles){
  const sql=(await readFile('drizzle/'+file,'utf8')).replace(/--.*$/gm,'');
  for(const rule of forbidden)if(rule.test(sql))throw new Error(`Migração insegura: ${file} (${rule})`);
}
console.log(`${newFiles.length} migração(ões) nova(s) verificada(s).`);
