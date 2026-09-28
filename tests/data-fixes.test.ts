import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';

mkdirSync('work',{recursive:true});const file=`work/data-fix-${crypto.randomUUID()}.sqlite`,db=new DatabaseSync(file),apply=(path:string)=>readFileSync(path,'utf8').split('--> statement-breakpoint').forEach(sql=>{if(sql.trim())db.exec(sql)});apply('drizzle/0000_light_ben_urich.sql');apply('drizzle/0001_harsh_nebula.sql');apply('drizzle/0008_freezing_eternity.sql');db.prepare('INSERT INTO productions VALUES(?,?,?,?,?,?)').run('row-1','owner','2026-09-01',JSON.stringify({date:'2026-09-02'}),1,'now');db.close();
execFileSync(process.execPath,['scripts/data-fixes/m5-date-backfill.mjs','--db',file],{stdio:'pipe'});let check=new DatabaseSync(file);assert.equal(check.prepare('SELECT date FROM productions').get()!.date,'2026-09-01');assert.equal(check.prepare('SELECT COUNT(*) AS n FROM data_fix_log').get()!.n,0);check.close();
execFileSync(process.execPath,['scripts/data-fixes/m5-date-backfill.mjs','--db',file,'--apply'],{stdio:'pipe'});check=new DatabaseSync(file);assert.equal(check.prepare('SELECT date FROM productions').get()!.date,'2026-09-02');assert.equal(check.prepare('SELECT COUNT(*) AS n FROM data_fix_log').get()!.n,1);check.close();
execFileSync(process.execPath,['scripts/data-fixes/revert.mjs','--db',file,'--fix','m5-date-backfill'],{stdio:'pipe'});check=new DatabaseSync(file);assert.equal(check.prepare('SELECT date FROM productions').get()!.date,'2026-09-01');check.close();console.log('PASS: data fix inicia em dry-run, registra antes/depois e reverte byte a byte');
