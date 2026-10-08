import { toNextJsHandler } from 'better-auth/next-js';
import { getIndependentAuth } from '@/lib/independent-auth';

export const dynamic = 'force-dynamic';
const handlers = () => toNextJsHandler(getIndependentAuth());
export async function GET(request: Request) { return handlers().GET(request); }
export async function POST(request: Request) { return handlers().POST(request); }
