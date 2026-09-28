import {DatabaseSync} from 'node:sqlite';
import {argument} from './lib.mjs';

const fix=argument('--fix'),dbPath=argument('--db');if(!fix||!dbPath)throw new Error('Use --fix <nome> --db <arquivo SQLite>.');
const db=new DatabaseSync(dbPath),rows=db.prepare('SELECT * FROM data_fix_log WHERE fix=? ORDER BY at DESC').all(fix);for(const row of rows){if(!/^[a-z0-9_]+$/i.test(row.table_name)||!/^[a-z0-9_]+$/i.test(row.field))throw new Error('Registro de reversão inválido.');db.exec('BEGIN IMMEDIATE');try{db.prepare(`UPDATE ${row.table_name} SET ${row.field}=? WHERE id=?`).run(JSON.parse(row.before),row.row_id);db.prepare('DELETE FROM data_fix_log WHERE id=?').run(row.id);db.exec('COMMIT')}catch(error){db.exec('ROLLBACK');throw error}}db.close();console.log(`${rows.length} alteração(ões) revertida(s).`);
