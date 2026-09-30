import assert from 'node:assert/strict';
import {DatabaseSync,type SQLInputValue} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {structuredCatalogHandlers} from '../lib/structured-catalog-api';
import {emptyNutrition} from '../lib/menu-catalog';

const sql=new DatabaseSync(':memory:');
for(const file of readdirSync('drizzle').filter(name=>/^\d+.*\.sql$/.test(name)).sort())for(const statement of readFileSync('drizzle/'+file,'utf8').split('--> statement-breakpoint'))if(statement.trim())sql.exec(statement);
function prepare(query:string){let args:SQLInputValue[]=[];return{bind(...values:SQLInputValue[]){args=values;return this},async first(){return sql.prepare(query).get(...args)??null},async all(){return{results:sql.prepare(query).all(...args)}},async run(){return{meta:{changes:Number(sql.prepare(query).run(...args).changes)}}}}}
const db={prepare,async batch(statements:ReturnType<typeof prepare>[]){sql.exec('BEGIN IMMEDIATE');try{const results=[];for(const statement of statements)results.push(await statement.run());sql.exec('COMMIT');return results}catch(error){sql.exec('ROLLBACK');throw error}}};
const user=async()=>({userId:'stable-owner',email:'owner@example.test'}),sheets=structuredCatalogHandlers(db,user,'technicalSheets'),equipment=structuredCatalogHandlers(db,user,'equipment');
const request=(data:unknown,version=0)=>new Request('https://example.test/api/catalog',{method:'POST',headers:{'content-type':'application/json','x-prumo-request':'1',origin:'https://example.test'},body:JSON.stringify({data,version})});
const sheet={id:crypto.randomUUID(),preparation:'Arroz branco',code:'FT-01',category:'Guarnição',responsible:'RT',prepMinutes:10,cookMinutes:30,yieldKg:8,portions:80,portionGrams:100,equipmentIds:[],nutrition:emptyNutrition(),photoVersion:null,ingredients:[{name:'Arroz',qty:5,unit:'kg',unitPrice:6,priceUnit:'kg'}],additionalCosts:[],instructions:'Selecionar, lavar e cozinhar.'};
let response=await sheets.POST(request(sheet));assert.equal(response.status,200,await response.clone().text());let saved:any=await response.json();assert.equal(saved.revision,1);assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM technical_sheet_revisions').get()!.n,1);
response=await sheets.POST(request({...saved,instructions:'Selecionar, lavar, cozinhar e conferir.'},saved.version));assert.equal(response.status,200,await response.clone().text());saved=await response.json();assert.equal(saved.revision,2);assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM technical_sheet_revisions').get()!.n,2);
assert.equal((await sheets.POST(request({...saved,instructions:'Conflito'},1))).status,409);
response=await sheets.POST(request({...saved,archived:true},saved.version));assert.equal(response.status,200);const listed:any[]=await(await sheets.GET()).json();assert.equal(listed[0].archived,true);assert.equal(listed[0].revision,3);
const renamedIdentity=structuredCatalogHandlers(db,async()=>({userId:'stable-owner',email:'new-owner@example.test'}),'technicalSheets');assert.equal(((await(await renamedIdentity.GET()).json()) as any[]).length,1,'a identidade estável preserva os dados após mudança de e-mail');assert.equal(sql.prepare("SELECT COUNT(*) AS n FROM account_identities WHERE account_id='owner@example.test'").get()!.n,3);
const first={id:crypto.randomUUID(),name:'Caldeira Á Gás',category:'Caldeira',number:'03',size:'',weightKg:null,capacity:'200 L',notes:''};assert.equal((await equipment.POST(request(first))).status,200);
const duplicate={...first,id:crypto.randomUUID(),name:'  caldeira a gás  '};response=await equipment.POST(request(duplicate));assert.equal(response.status,409);assert.equal((await response.json() as any).code,'duplicate');
console.log('PASS: fichas estruturadas versionadas, revisões atômicas, arquivamento e duplicidade de equipamentos no servidor.');
sql.close();
