import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '@/app/chatgpt-auth';
import {productionHandlers,response} from '@/lib/production-api';
export async function GET(req:Request){if(!env.DB)return response({error:'Armazenamento indisponível.'},503);return productionHandlers(env.DB,getChatGPTUser).GET(req)}
export async function POST(req:Request){if(!env.DB)return response({error:'Armazenamento indisponível.'},503);return productionHandlers(env.DB,getChatGPTUser).POST(req)}
