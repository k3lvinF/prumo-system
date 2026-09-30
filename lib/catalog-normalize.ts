import {equipmentSchema,menuTemplateSchema,technicalSheetSchema,type CatalogReview,type Equipment,type MenuCatalog,type MenuTemplate,type TechnicalSheet} from './menu-catalog';

type Quarantined={section:CatalogReview['section'];index:number;id?:string;issues:string[];value:unknown};
const array=(value:unknown)=>Array.isArray(value)?value:[];
const issues=(error:any)=>error.issues.map((issue:any)=>`${issue.path.join('.')||'item'}: ${issue.message}`);
export function normalizeCatalog(raw:any,version=0):{catalog:MenuCatalog;invalid:CatalogReview[];quarantine:Quarantined[]}{
  const invalid:CatalogReview[]=[],quarantine:Quarantined[]=[];
  const parse=<T>(section:CatalogReview['section'],values:unknown[],schema:any):T[]=>values.flatMap((value,index)=>{const parsed=schema.safeParse(value);if(parsed.success)return[parsed.data as T];const review={section,index,id:typeof value==='object'&&value&&typeof (value as any).id==='string'?(value as any).id:undefined,issues:issues(parsed.error)};invalid.push(review);quarantine.push({...review,value});return[]});
  const preparations=parse<string>('preparations',array(raw?.preparations),{safeParse:(value:unknown)=>typeof value==='string'&&value.trim()&&value.length<=160?{success:true,data:value.trim()}:{success:false,error:{issues:[{path:[],message:'Nome inválido'}]}}});
  const menus=parse<MenuTemplate>('menus',array(raw?.menus),menuTemplateSchema);
  const technicalSheets=parse<TechnicalSheet>('technicalSheets',array(raw?.technicalSheets),technicalSheetSchema);
  const equipment=parse<Equipment>('equipment',array(raw?.equipment),equipmentSchema);
  for(const item of array(raw?.quarantine)){if(item&&typeof item==='object'&&['preparations','menus','technicalSheets','equipment'].includes((item as any).section)){const q=item as Quarantined;invalid.push({section:q.section,index:q.index,id:q.id,issues:q.issues??['Item em quarentena']});quarantine.push(q)}}
  return{catalog:{version,preparations,menus,technicalSheets,equipment},invalid,quarantine};
}
