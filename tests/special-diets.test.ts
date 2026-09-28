import assert from 'node:assert/strict';
import {fresh,prepSourceWeights,specialDietNetWeight,type Entry} from '../lib/uan';
import {validateProduction} from '../lib/production-api';

const production=fresh('2026-09-27','RT');production.preps=[{id:'rice',name:'Arroz',raw:10,clean:null,portion:null,cost:null,costComplete:false,remaining:1,loss:0,closed:true,note:''}];
const now=new Date().toISOString(),container:Entry={id:'gn',prep:'rice',work:'',type:'GN M',quantity:1,tare:1,gross:6,temperature:null,vehicle:'',driver:'',operator:'RT',at:now,created:now,note:'',cancelled:false};production.entries=[container];const before=prepSourceWeights(production,production.preps[0]);
production.entries.push({id:'special',prep:'',work:'',type:'Marmita',quantity:4,tare:.05,gross:2.2,temperature:null,vehicle:'',driver:'',operator:'RT',at:now,created:now,note:'',cancelled:false,lunchboxes:Array.from({length:4},()=>({diet:'especial',components:[{name:'Arroz',prep:'rice',grams:null,units:null,utensil:''}]}))});
const after=prepSourceWeights(production,production.preps[0]);assert.equal(after.containers,before.containers);assert.equal(after.cookedNormal,before.cookedNormal);assert.equal(after.readyNormal,before.readyNormal);assert.equal(after.readyTotal,null);assert.equal(after.specialPending,true);
const legacy={...container,id:'legacy',type:'Marmita',diet:'especial' as const,gross:1.5};assert.equal(specialDietNetWeight(legacy),.5);production.entries.push(legacy);assert.equal(prepSourceWeights(production,production.preps[0]).legacySpecial,.5);
const invalid=fresh('2026-09-28','RT');invalid.preps=production.preps;invalid.entries=[{...container,id:'new',type:'Marmita'}];assert.equal(validateProduction(invalid,fresh('2026-09-28','RT')),'Informe a composição das marmitas.');
console.log('PASS: dietas especiais não alteram GNs/cozido normal; pendências e registros antigos ficam separados');
