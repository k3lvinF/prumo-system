import {jsPDF} from 'jspdf';
import autoTable from 'jspdf-autotable';
import {normal,bold} from './pdf-font';
import {GSI_BLACK,GSI_RED,GSI_STATIONERY} from './gsi-brand';
import {technicalSheetCost,type Equipment,type TechnicalSheet} from './menu-catalog';

const value=(v:number|null,unit='')=>v===null?'Não informado':v.toLocaleString('pt-BR',{maximumFractionDigits:2})+unit;
export function makeTechnicalSheetReport(sheet:TechnicalSheet,equipment:Equipment[],photo?:string){
  const doc=new jsPDF();doc.addFileToVFS('Prumo.ttf',normal);doc.addFont('Prumo.ttf','Prumo','normal');doc.addFileToVFS('PrumoBold.ttf',bold);doc.addFont('PrumoBold.ttf','Prumo','bold');doc.setFont('Prumo','normal');
  let y=52;
  const newPage=()=>{doc.addPage();y=52};
  const text=(content:string,size=9,boldText=false)=>{doc.setFont('Prumo',boldText?'bold':'normal');doc.setFontSize(size);doc.setTextColor(...GSI_BLACK);const lines=doc.splitTextToSize(content,174);if(y+lines.length*4.5>252)newPage();doc.text(lines,18,y);y+=lines.length*4.5+3};
  const table=(head:string[],body:any[][])=>{if(y>225)newPage();autoTable(doc,{startY:y,head:[head],body,margin:{left:18,right:18,top:52,bottom:42},rowPageBreak:'avoid',styles:{font:'Prumo',fontSize:8,cellPadding:2.6,textColor:GSI_BLACK,overflow:'linebreak'},headStyles:{fillColor:GSI_RED,textColor:[255,255,255]},alternateRowStyles:{fillColor:[255,249,219]}});y=(doc as any).lastAutoTable.finalY+8};
  doc.setTextColor(...GSI_RED);doc.setFont('Prumo','bold');doc.setFontSize(16);doc.text('FICHA TÉCNICA DE PREPARAÇÃO',18,y);y+=8;doc.setFontSize(12);
  const title=doc.splitTextToSize(sheet.preparation,photo?120:174);doc.text(title,18,y);const titleBottom=y+title.length*5;
  let photoBottom=52;
  if(photo){try{const properties=doc.getImageProperties(photo),format=photo.startsWith('data:image/png')?'PNG':'JPEG',scale=Math.min(45/properties.width,34/properties.height),width=properties.width*scale,height=properties.height*scale,x=190-width;doc.addImage(photo,format,x,52,width,height,undefined,'FAST');photoBottom=52+height}catch{}}
  y=Math.max(titleBottom,photoBottom)+6;
  table(['Identificação','Valor','Produção','Valor'],[['Código',sheet.code||'Não informado','Categoria',sheet.category||'Não informada'],['Responsável',sheet.responsible||'Não informado','Atualização',new Date().toLocaleDateString('pt-BR')],['Pré-preparo',value(sheet.prepMinutes,' min'),'Cocção',value(sheet.cookMinutes,' min')],['Rendimento pronto',value(sheet.yieldKg,' kg'),'Número de porções',value(sheet.portions)],['Porção padrão',value(sheet.portionGrams,' g'),'Custo total',technicalSheetCost(sheet).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})]]);
  const selected=equipment.filter(x=>sheet.equipmentIds.includes(x.id));text('UTENSÍLIOS E EQUIPAMENTOS',11,true);table(['Equipamento','Identificação','Tamanho/capacidade','Peso vazio'],selected.length?selected.map(x=>[x.name,x.number||'—',[x.size,x.capacity].filter(Boolean).join(' / ')||'—',value(x.weightKg,' kg')]):[['Não informado','—','—','—']]);
  text('INGREDIENTES',11,true);table(['Ingrediente','Quantidade','Unidade','Preço unitário','Subtotal'],sheet.ingredients.map(x=>[x.name,value(x.qty),x.unit,x.unitPrice.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}),(x.qty*x.unitPrice).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})]));
  if(sheet.additionalCosts.length)table(['Outros custos','Valor'],sheet.additionalCosts.map(x=>[x.name,x.value.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})]));
  text('MODO DE PREPARO',11,true);text(sheet.instructions||'Não informado.',9);text('INFORMAÇÃO NUTRICIONAL DECLARADA',11,true);text('Valores informados por porção padrão. Não substituem análise laboratorial ou cálculo com base de composição validada.',8);
  const n=sheet.nutrition;table(['Energia','Carboidratos','Proteínas','Gorduras totais','Gorduras saturadas'],[[value(n.energyKcal,' kcal'),value(n.carbohydrates,' g'),value(n.protein,' g'),value(n.totalFat,' g'),value(n.saturatedFat,' g')]]);table(['Fibras','Sódio','Cálcio','Ferro'],[[value(n.fiber,' g'),value(n.sodium,' mg'),value(n.calcium,' mg'),value(n.iron,' mg')]]);
  const pages=doc.getNumberOfPages();for(let i=1;i<=pages;i++){doc.setPage(i);doc.addImage(GSI_STATIONERY,'PNG',0,0,210,297,undefined,'FAST');doc.setFont('Prumo','normal');doc.setFontSize(8);doc.setTextColor(...GSI_RED);doc.text('PRUMO SYSTEM | Ficha técnica | Uso interno',18,284);doc.setTextColor(...GSI_BLACK);doc.text(i+' / '+pages,188,284,{align:'right'})}return doc;
}
