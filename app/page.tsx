import Workspace from '@/components/uan/workspace';
import {requireAppUser} from '@/app/app-auth';
export default async function Page(){await requireAppUser('/','production:read');return <Workspace/>}
