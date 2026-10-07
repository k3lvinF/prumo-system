import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {productionHandlers} from '../lib/production-api';
import {fresh} from '../lib/uan';

const sql=new DatabaseSync(':memory:');for(const file of ['drizzle/0000_light_ben_urich.sql','drizzle/0001_harsh_nebula.sql','drizzle/0002_previous_paper_doll.sql'])for(const statement of readFileSync(file,'utf8').split('--> statement-breakpoint'))if(statement.trim())sql.exec(statement);const victim=fresh('2026-09-27','RT');victim.version=1;sql.prepare('INSERT INTO productions VALUES(?,?,?,?,?,?)').run(victim.id,'victim-stable-id',victim.date,JSON.stringify(victim),1,new Date().toISOString());
const prepare=(query:string)=>({bind:(...args:any[])=>({first:async()=>sql.prepare(query).get(...args),all:async()=>({results:sql.prepare(query).all(...args)}),run:async()=>({meta:{changes:Number(sql.prepare(query).run(...args).changes)}})})});const db={prepare,batch:async(statements:any[])=>Promise.all(statements.map(statement=>statement.run()))};
const attacker=productionHandlers(db,async()=>({userId:'attacker-stable-id',email:'attacker@example.test'})),attackList:any[]=await(await attacker.GET(new Request('https://example.test/api/productions'))).json();assert.equal(attackList.length,0);assert.equal(sql.prepare('SELECT owner FROM productions WHERE id=?').get(victim.id)!.owner,'victim-stable-id');
const owner=productionHandlers(db,async()=>({userId:'victim-stable-id',email:'victim@example.test'})),ownList:any[]=await(await owner.GET(new Request('https://example.test/api/productions'))).json();assert.equal(ownList.length,1);assert.equal(sql.prepare('SELECT owner FROM productions WHERE id=?').get(victim.id)!.owner,'victim@example.test');
const invited=productionHandlers(db,async()=>({userId:'operator-stable-id',email:'operator@example.test',workspaceOwner:'victim@example.test'})),sharedList:any[]=await(await invited.GET(new Request('https://example.test/api/productions'))).json();assert.equal(sharedList.length,1);assert.equal(sharedList[0].id,victim.id,'operador convidado acessa o espaço operacional compartilhado');
console.log('PASS: outra conta não captura dados; somente a identidade estável da própria vítima migra para seu e-mail');sql.close();
