import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '@/app/chatgpt-auth';

// Sites controls who may enter. Invited operators share operational records,
// while their verified email remains available for the audit trail.
export async function getWorkspaceUser(){
  const user=await getChatGPTUser();
  if(!user)return null;
  const workspaceOwner=env.PRUMO_WORKSPACE_OWNER?.trim().toLowerCase();
  return workspaceOwner?{...user,workspaceOwner}:user;
}
