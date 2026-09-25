import {z} from 'zod';

export const proteinChoices=['Filé de peito de frango','Linguiça tipo toscana','Bisteca suína','Bife bovino','Peito de frango com osso','Rabada'];
export const defaultPreparations=['Arroz','Feijão','Macarrão',...proteinChoices];
export type MenuAudience='campo'|'adm'|'dietas';
export type MenuTemplate={id:string;name:string;audience:MenuAudience;items:string[]};
export type MenuCatalog={version:number;preparations:string[];menus:MenuTemplate[]};
const label=z.string().trim().min(1).max(160);
export const menuCatalogSchema=z.object({version:z.number().int().nonnegative(),preparations:z.array(label).max(300),menus:z.array(z.object({id:z.string().uuid(),name:label,audience:z.enum(['campo','adm','dietas']),items:z.array(label).min(1).max(40)})).max(300)});
export const emptyCatalog=():MenuCatalog=>({version:0,preparations:[...defaultPreparations],menus:[]});
export const audienceLabel=(value:MenuAudience)=>value==='campo'?'Campo':value==='adm'?'Administrativo':'Dietas especiais/restritivas';
const canonical=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').replace(/\b(tipo|assado|assada|suino|suina)\b/g,'').replace(/\s+/g,' ').trim();
export const preparationMatches=(registered:string,item:string)=>canonical(registered)===canonical(item);
