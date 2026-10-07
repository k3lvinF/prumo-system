import {env} from 'cloudflare:workers';
import {getWorkspaceUser} from '@/app/workspace-auth';
import {menuCatalogHandlers} from '@/lib/menu-catalog-api';
import {response} from '@/lib/production-api';
export async function GET(){if(!env.DB)return response({error:'Armazenamento indisponível.'},503);return menuCatalogHandlers(env.DB,()=>getWorkspaceUser('catalog:read')).GET()}
export async function POST(req:Request){if(!env.DB)return response({error:'Armazenamento indisponível.'},503);return menuCatalogHandlers(env.DB,()=>getWorkspaceUser('catalog:write')).POST(req)}
