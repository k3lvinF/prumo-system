import {requireAppUser} from '@/app/app-auth';
import TeamClient from './team-client';
export default async function TeamPage(){await requireAppUser('/equipe','team:read');return <TeamClient/>}
