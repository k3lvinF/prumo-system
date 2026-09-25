import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '@/app/chatgpt-auth';
import {evidenceHandlers} from '@/lib/hours-api';
import {response} from '@/lib/production-api';
export async function GET(req:Request){if(!env.DB||!env.BUCKET)return response({error:'Armazenamento de comprovantes indisponível.'},503);return evidenceHandlers(env.DB,env.BUCKET,getChatGPTUser).GET(req)}
export async function POST(req:Request){if(!env.DB||!env.BUCKET)return response({error:'Armazenamento de comprovantes indisponível.'},503);return evidenceHandlers(env.DB,env.BUCKET,getChatGPTUser).POST(req)}
