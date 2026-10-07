import {env} from 'cloudflare:workers';
import {getWorkspaceUser} from '@/app/workspace-auth';
import {productionHandlers,response} from '@/lib/production-api';
export async function GET(req:Request){if(!env.DB)return response({error:'Armazenamento indisponível.'},503);return productionHandlers(env.DB,getWorkspaceUser).GET(req)}
export async function POST(req:Request){if(!env.DB)return response({error:'Armazenamento indisponível.'},503);return productionHandlers(env.DB,getWorkspaceUser).POST(req)}
