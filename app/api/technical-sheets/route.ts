import {env} from 'cloudflare:workers';
import {getWorkspaceUser} from '@/app/workspace-auth';
import {response} from '@/lib/production-api';
import {structuredCatalogHandlers} from '@/lib/structured-catalog-api';
export async function GET(){if(!env.DB)return response({error:'Armazenamento indisponível.'},503);return structuredCatalogHandlers(env.DB,getWorkspaceUser,'technicalSheets').GET()}
export async function POST(req:Request){if(!env.DB)return response({error:'Armazenamento indisponível.'},503);return structuredCatalogHandlers(env.DB,getWorkspaceUser,'technicalSheets').POST(req)}
