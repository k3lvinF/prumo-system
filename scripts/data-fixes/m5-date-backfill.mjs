import {argument,runFix} from './lib.mjs';

await runFix({name:'m5-date-backfill',dbPath:argument('--db'),select:"SELECT id,date,json_extract(data,'$.date') AS json_date FROM productions WHERE json_date IS NOT NULL AND date<>json_date",transform:row=>({table:'productions',rowId:row.id,field:'date',before:row.date,after:row.json_date})});
