import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {menuCatalogHandlers} from '../lib/menu-catalog-api';

const sql=new DatabaseSync(':memory:');for(const file of ['drizzle/0000_light_ben_urich.sql','drizzle/0001_harsh_nebula.sql','drizzle/0002_previous_paper_doll.sql'])for(const statement of readFileSync(file,'utf8').split('--> statement-breakpoint'))if(statement.trim())sql.exec(statement);
const db={prepare:(query:string)=>({bind:(...args:any[])=>({first:async()=>sql.prepare(query).get(...args),all:async()=>({results:sql.prepare(query).all(...args)}),run:async()=>({meta:{changes:Number(sql.prepare(query).run(...args).changes)}})})})};
const owner='catalog@example.test',raw={preparations:['Arroz'],menus:[],technicalSheets:null,equipment:[{id:crypto.randomUUID(),name:'Sem categoria'}]};sql.prepare('INSERT INTO menu_catalogs(owner,data,version,updated) VALUES(?,?,?,?)').run(owner,JSON.stringify(raw),1,new Date().toISOString());
const api=menuCatalogHandlers(db,async()=>({userId:owner,email:owner})),loaded=await api.GET(),catalog:any=await loaded.json();assert.equal(loaded.status,200);assert.deepEqual(catalog.technicalSheets,[]);assert.deepEqual(catalog.equipment,[]);assert.equal(catalog.needsReview.length,1);
const request=new Request('https://example.test/api/catalog',{method:'POST',headers:{'content-type':'application/json','x-prumo-request':'1',origin:'https://example.test'},body:JSON.stringify({data:catalog})}),saved=await api.POST(request);assert.equal(saved.status,200,await saved.clone().text());const stored=JSON.parse(sql.prepare('SELECT data FROM menu_catalogs WHERE owner=?').get(owner)!.data as string);assert.equal(stored.quarantine.length,1);
console.log('PASS: catálogo antigo abre parcialmente e itens inválidos permanecem em quarentena');sql.close();
