export function logError(route:string,code:string,err:unknown,meta?:{id?:string}){
  const message=err instanceof Error?err.message:String(err??'unknown');
  console.error(JSON.stringify({route,code,message,production:meta?.id?.slice(0,8)}));
}
