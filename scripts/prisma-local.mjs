import {readFile} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import {spawn} from 'node:child_process';
import nextEnv from '@next/env';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('..',import.meta.url));
nextEnv.loadEnvConfig(root,true);
try{const local=parseEnv(await readFile(new URL('../.env.local',import.meta.url),'utf8'));if(local.DATABASE_URL)process.env.DATABASE_URL=local.DATABASE_URL;}catch(e){if(e.code!=='ENOENT')throw e;}
if(!process.env.DATABASE_URL)throw Error('Set the shared DATABASE_URL in .env.local before using Prisma. No database was selected.');
const child=spawn(process.execPath,[fileURLToPath(new URL('../node_modules/prisma/build/index.js',import.meta.url)),...process.argv.slice(2)],{cwd:root,env:process.env,stdio:'inherit'});
process.on('SIGINT',()=>child.kill('SIGINT'));process.on('SIGTERM',()=>child.kill('SIGTERM'));child.on('exit',code=>process.exit(code??1));
