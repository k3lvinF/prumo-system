import {mkdir,readdir} from 'node:fs/promises';
import {spawn} from 'node:child_process';

await Promise.all([mkdir('work',{recursive:true}),mkdir('.sites-runtime',{recursive:true})]);
const tests=(await readdir('tests')).filter(name=>name.endsWith('.test.ts')).sort();
for(const test of tests){
  await new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,['--import','tsx','tests/'+test],{stdio:'inherit',env:process.env});
    child.once('error',reject);
    child.once('exit',code=>code===0?resolve():reject(new Error(`${test} falhou com código ${code}`)));
  });
}
