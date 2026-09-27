import {z} from 'zod';

export const proteinChoices=['Filé de peito de frango','Linguiça tipo toscana','Bisteca suína','Bife bovino','Peito de frango com osso','Rabada'];
export const defaultPreparations=['Arroz','Feijão','Macarrão',...proteinChoices];
export type MenuAudience='campo'|'adm'|'dietas';
export type MenuTemplate={id:string;name:string;audience:MenuAudience;items:string[]};
export type TechnicalIngredient={name:string;qty:number;unit:string;unitPrice:number};
export type TechnicalCost={name:string;value:number};
export type TechnicalSheet={id:string;preparation:string;yieldKg:number|null;portions:number|null;portionGrams:number|null;ingredients:TechnicalIngredient[];additionalCosts:TechnicalCost[];instructions:string};
export type MenuCatalog={version:number;preparations:string[];menus:MenuTemplate[];technicalSheets:TechnicalSheet[]};
const label=z.string().trim().min(1).max(160);
const optionalPositive=z.number().positive().nullable();
export const menuCatalogSchema=z.object({version:z.number().int().nonnegative(),preparations:z.array(label).max(300),menus:z.array(z.object({id:z.string().uuid(),name:label,audience:z.enum(['campo','adm','dietas']),items:z.array(label).min(1).max(40)})).max(300),technicalSheets:z.array(z.object({id:z.string().uuid(),preparation:label,yieldKg:optionalPositive,portions:z.number().int().positive().nullable(),portionGrams:optionalPositive,ingredients:z.array(z.object({name:z.string().trim().min(1).max(100),qty:z.number().positive(),unit:z.string().trim().min(1).max(20),unitPrice:z.number().nonnegative()})).max(100),additionalCosts:z.array(z.object({name:z.string().trim().min(1).max(100),value:z.number().nonnegative()})).max(50),instructions:z.string().trim().max(3000)})).max(300).default([])});
export const emptyCatalog=():MenuCatalog=>({version:0,preparations:[...defaultPreparations],menus:[],technicalSheets:[]});
export const audienceLabel=(value:MenuAudience)=>value==='campo'?'Campo':value==='adm'?'Administrativo':'Dietas especiais/restritivas';
const canonical=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').replace(/\b(tipo|assado|assada|suino|suina)\b/g,'').replace(/\s+/g,' ').trim();
export const preparationMatches=(registered:string,item:string)=>canonical(registered)===canonical(item);
export const technicalSheetCost=(sheet:TechnicalSheet)=>sheet.ingredients.reduce((sum,item)=>sum+item.qty*item.unitPrice,0)+sheet.additionalCosts.reduce((sum,item)=>sum+item.value,0);
