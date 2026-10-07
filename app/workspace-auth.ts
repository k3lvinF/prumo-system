import {env} from 'cloudflare:workers';
import {getAppUser} from '@/app/app-auth';
import type {Permission} from '@/lib/access-control';

// Sites controls who may enter. Invited operators share operational records,
// while their verified email remains available for the audit trail.
export async function getWorkspaceUser(permission?:Permission){
  const user=await getAppUser(permission);
  if(!user)return null;
  const workspaceOwner=env.PRUMO_WORKSPACE_OWNER?.trim().toLowerCase();
  return workspaceOwner?{...user,workspaceOwner}:user;
}
