export const UNITS=['g','kg','mL','L','un'] as const;
export type Unit=typeof UNITS[number];
const grams=(value:number,unit:Unit)=>unit==='kg'?value*1000:unit==='g'?value:value;
const ml=(value:number,unit:Unit)=>unit==='L'?value*1000:unit==='mL'?value:value;
export function unitCost(qty:number,unit:Unit,price:number,priceUnit:Unit){if(unit==='un'||priceUnit==='un')return unit===priceUnit?qty*price:NaN;if(unit==='g'||unit==='kg')return grams(qty,unit)/grams(1,priceUnit)*price;if(unit==='mL'||unit==='L')return ml(qty,unit)/ml(1,priceUnit)*price;return NaN}
