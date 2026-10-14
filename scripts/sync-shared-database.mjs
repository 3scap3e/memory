import {readFile,writeFile} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root=fileURLToPath(new URL('..',import.meta.url));
const source=parseEnv(await readFile(new URL('../.env.local',import.meta.url),'utf8')).DATABASE_URL;
if(!source)throw Error('Save the shared DATABASE_URL in Memory .env.local first. No files changed.');
const database=new URL(source);
if(!['postgres:','postgresql:','prisma+postgres:'].includes(database.protocol))throw Error('Expected the shared PostgreSQL connection. No files changed.');
if(['54329','54339'].includes(database.port)&&['localhost','127.0.0.1'].includes(database.hostname))throw Error('This is a sandbox connection, not the shared production database. No files changed.');
for(const app of ['memory','parley','devrel']){
 const file=fileURLToPath(new URL(`../../${app}/.env.local`,import.meta.url));
 let contents='';try{contents=await readFile(file,'utf8');}catch(e){if(e.code!=='ENOENT')throw e;}
 const lines=contents.split('\n').filter(line=>!/^\s*(?:export\s+)?DATABASE_URL\s*=/.test(line));
 if(lines.at(-1)==='')lines.pop();
 await writeFile(file,lines.join('\n')+'\nDATABASE_URL='+JSON.stringify(source)+'\n',{mode:0o600});
 console.log(`${app}: shared database configured`);
}
console.log('All three local apps now share connection fingerprint '+createHash('sha256').update(source).digest('hex').slice(0,12)+'. Restart ordinary dev servers; sandbox launchers override the connection.');
