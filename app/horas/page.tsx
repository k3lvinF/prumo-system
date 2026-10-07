import HoursWorkspace from '@/components/uan/hours-workspace';
import {requireAppUser} from '@/app/app-auth';
import '../hours.css';
export default async function HoursPage(){await requireAppUser('/horas');return <HoursWorkspace/>}
