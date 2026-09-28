import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {productionHandlers,MAX_BODY_BYTES} from '../lib/production-api';
import {fresh} from '../lib/uan';
const sql=new DatabaseSync(':memory:');
const migrate=(file:string)=>readFileSync(file,'utf8').split('--> statement-breakpoint').forEach(s=>{if(s.trim())sql.exec(s)});
migrate('drizzle/0000_light_ben_urich.sql');
sql.prepare('INSERT INTO productions VALUES(?,?,?,?,?,?)').run('test','owner','2026-09-11','{}',1,'now');
migrate('drizzle/0001_harsh_nebula.sql');
assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM productions').get()!.n,0);
assert.equal(sql.prepare('SELECT affected FROM system_events').get()!.affected,1);
const db={prepare:(q:string)=>({bind:(...args:any[])=>({
 first:async()=>sql.prepare(q).get(...args),
 all:async()=>({results:sql.prepare(q).all(...args)}),
 run:async()=>({meta:{changes:Number(sql.prepare(q).run(...args).changes)}})
})})};
const api=(owner:string|null)=>productionHandlers(db,async()=>owner?{userId:owner}:null);
const req=(data:any,headers:Record<string,string>={})=>new Request('https://example.test/api/productions',{method:'POST',headers:{'content-type':'application/json','x-prumo-request':'1',origin:'https://example.test',...headers},body:typeof data==='string'?data:JSON.stringify({data,action:'Salvar teste'})});
let count=2;async function status(p:Promise<Response>,expected:number){const r=await p;assert.equal(r.status,expected,await r.clone().text());count++;return r;}
const a=api('A'),b=api('B');
await status(api(null).GET(new Request('https://example.test/api/productions')),401);
await status(api(null).POST(req({})),401);
let s=fresh('2026-09-11','RT');
const deniedHeaders:Record<string,string>[]=[{origin:'https://evil.test'},{'sec-fetch-site':'cross-site'},{'x-prumo-request':''},{'content-type':'text/plain'}];for(const headers of deniedHeaders)await status(a.POST(req(s,headers)),403);
await status(a.POST(req('{broken')),400);
await status(a.POST(req('{"__proto__":{"polluted":true}}')),400);assert.equal(({} as any).polluted,undefined);
await status(a.POST(req(' '.repeat(MAX_BODY_BYTES+1))),413);
await status(a.POST(req(s,{'content-length':String(MAX_BODY_BYTES+1)})),413);
s=await(await status(a.POST(req(s)),200)).json();
assert.equal(s.audit[0].account,'A');
assert.deepEqual(await(await b.GET(new Request('https://example.test/api/productions'))).json(),[]);count++;
await status(b.GET(new Request('https://example.test/api/productions?id='+s.id)),404);
await status(b.POST(req(s)),409);
await status(b.POST(req({...s,version:0})),409);
await status(a.GET(new Request("https://example.test/api/productions?id='OR%201=1--")),404);
assert.deepEqual(await(await api("' OR 1=1--").GET(new Request('https://example.test/api/productions'))).json(),[]);count++;
s.preps=[{id:'rice',name:'Arroz',raw:10,clean:null,portion:null,cost:null,costComplete:false,remaining:null,loss:null,closed:false,note:''}];
s.works=[{id:'w',name:'Obra',worker:null,admin:null,servedWorker:null,servedAdmin:null,vehicle:'V1',driver:'M',route:'Centro'}];
s.entries=[{id:'e',prep:'rice',work:'w',type:'GN PP',quantity:1,tare:1,gross:8,temperature:80,vehicle:'V1',driver:'M',route:'Centro',operator:'RT',at:new Date().toISOString(),created:'2000-01-01T00:00:00.000Z',cancelled:false,note:''}];
for(const patch of [{tare:-1},{gross:1},{work:'missing'},{temperature:200}]){const t=structuredClone(s);Object.assign(t.entries[0],patch);await status(a.POST(req(t)),400)}
const duplicate=structuredClone(s);duplicate.entries.push(duplicate.entries[0]);await status(a.POST(req(duplicate)),400);
s.audit=[{at:'fake',operator:'fake',action:'FAKE'}];
s=await(await status(a.POST(req(s)),200)).json();assert.notEqual(s.entries[0].created,'2000-01-01T00:00:00.000Z');assert.equal(s.audit.length,2);assert.ok(s.audit.every((x:any)=>x.account==='A'));
for(const patch of [{created:'2001-01-01T00:00:00.000Z'}]){const t=structuredClone(s);Object.assign(t.entries[0],patch);await status(a.POST(req(t)),400)}
await status(a.POST(req({...s,entries:[]})),400);
await status(a.POST(req({...s,version:0})),409);
const concurrent=await Promise.all([a.POST(req(s)),a.POST(req(s))]);assert.deepEqual(concurrent.map(r=>r.status).sort(),[200,409]);count++;
s=await concurrent.find(r=>r.status===200)!.json();
const originalTime=s.entries[0].at;s.entries[0]={...s.entries[0],work:'',vehicle:'',driver:'',temperature:null,gross:9,note:'Pesagem inicial'};
s=await(await status(a.POST(req(s)),200)).json();assert.equal(s.entries[0].work,'');assert.ok(s.audit.at(-1)!.changes![0].fields.includes('gross'));assert.equal(s.entries[0].at,originalTime);
s.entries[0]={...s.entries[0],work:'w',vehicle:'V2',driver:'Motorista atualizado',temperature:79};
s=await(await status(a.POST(req(s)),200)).json();assert.equal(s.entries[0].driver,'Motorista atualizado');
const batch={...s.entries[0],id:'batch',prep:'',type:'Marmita',quantity:5000,gross:1000,tare:.05,lunchboxes:Array.from({length:5000},()=>({components:[{name:'Arroz',prep:'rice',grams:150,units:null,utensil:'Colher de servir'},{name:'Proteína 1',prep:'',grams:null,units:1,utensil:'Pegador médio'}]}))};
s.entries.push(batch);s=await(await status(a.POST(req(s)),200)).json();assert.equal(s.entries.at(-1)!.lunchboxes!.length,5000);
const tooMany=structuredClone(s);tooMany.entries.at(-1)!.quantity=5001;tooMany.entries.at(-1)!.lunchboxes!.push(structuredClone(batch.lunchboxes[0]));await status(a.POST(req(tooMany)),400);
const overweight=structuredClone(s);overweight.entries.at(-1)!.lunchboxes![0].components[0].grams=200000;await status(a.POST(req(overweight)),400);
s.entries[0].cancelled=true;s.entries[0].note='Erro de pesagem';
s=await(await status(a.POST(req(s)),200)).json();s.entries[0].cancelled=false;await status(a.POST(req(s)),400);
const headers=await a.GET(new Request('https://example.test/api/productions'));assert.match(headers.headers.get('cache-control')!,/no-store/);assert.equal(headers.headers.get('x-content-type-options'),'nosniff');count++;
const limited=api('rate');for(let i=0;i<120;i++)assert.equal((await limited.GET(new Request('https://example.test/api/productions'))).status,200);
await status(limited.GET(new Request('https://example.test/api/productions')),429);await status(b.GET(new Request('https://example.test/api/productions')),200);
const broken=productionHandlers({prepare:()=>{throw Error('SECRET SQL ERROR')}},async()=>({userId:'x'}));const err=await status(broken.GET(new Request('https://example.test/api/productions')),503);assert.ok(!(await err.text()).includes('SECRET'));
console.log(`PASS: ${count} security scenarios, real SQLite, isolated synthetic data; 120-request boundary verified`);
sql.close();

const mobileSql=new DatabaseSync(':memory:');
for(const part of readFileSync('drizzle/0000_light_ben_urich.sql','utf8').split('--> statement-breakpoint'))if(part.trim())mobileSql.exec(part);
for(const part of readFileSync('drizzle/0001_harsh_nebula.sql','utf8').split('--> statement-breakpoint'))if(part.trim())mobileSql.exec(part);
for(const part of readFileSync('drizzle/0002_previous_paper_doll.sql','utf8').split('--> statement-breakpoint'))if(part.trim())mobileSql.exec(part);
const legacy=fresh('2026-09-11','RT');legacy.version=1;
mobileSql.prepare('INSERT INTO productions VALUES(?,?,?,?,?,?)').run(legacy.id,'legacy-account-id',legacy.date,JSON.stringify(legacy),legacy.version,new Date().toISOString());
const mobileDb={prepare:(q:string)=>({bind:(...args:any[])=>({first:async()=>mobileSql.prepare(q).get(...args),all:async()=>({results:mobileSql.prepare(q).all(...args)}),run:async()=>({meta:{changes:Number(mobileSql.prepare(q).run(...args).changes)}})})})};
const mobile=productionHandlers(mobileDb,async()=>({userId:'legacy-account-id',email:'kelvin@example.test'}));
const mobileList=await mobile.GET(new Request('https://example.test/api/productions'));
assert.equal(mobileList.status,200);assert.equal(((await mobileList.json()) as unknown[]).length,1);
assert.equal(mobileSql.prepare('SELECT owner FROM productions').get()!.owner,'kelvin@example.test');
console.log('PASS: authenticated mobile email fallback preserves and finds legacy account records');
mobileSql.close();
const {renderToStaticMarkup}=await import('react-dom/server');
const {createElement}=await import('react');
const {default:DispatchSummary}=await import('../components/uan/dispatch-summary');
s.entries[0].cancelled=false;s.works[0].name='<script>alert(1)</script>';s.preps[0].name='<img src=x onerror=alert(1)>';s.entries[0].route='<svg onload=alert(1)>';
const html=renderToStaticMarkup(createElement(DispatchSummary,{production:s}));assert.ok(!html.includes('<script>'));assert.ok(!html.includes('<img src=x'));assert.ok(!html.includes('<svg onload'));assert.ok(html.includes('&lt;script&gt;'));console.log('PASS: actual destination component escapes stored HTML payloads');
