import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '@/app/chatgpt-auth';
import {hoursHandlers} from '@/lib/hours-api';
import {response} from '@/lib/production-api';
async function contacts(){const user=await getChatGPTUser();const owner=user?.email.trim().toLowerCase();return owner===env.HOURS_CONTACT_OWNER?{email:env.HOURS_PERSONAL_EMAIL??'',phone:env.HOURS_PERSONAL_WHATSAPP??''}:{email:'',phone:''}}
export async function GET(){if(!env.DB)return response({error:'Armazenamento indisponível.'},503);return hoursHandlers(env.DB,getChatGPTUser,await contacts()).GET()}
export async function POST(req:Request){if(!env.DB)return response({error:'Armazenamento indisponível.'},503);return hoursHandlers(env.DB,getChatGPTUser,await contacts()).POST(req)}
