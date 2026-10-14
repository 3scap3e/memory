import {readFile,readdir,mkdir} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {PGlite} from '@electric-sql/pglite';
import {PGLiteSocketServer} from '@electric-sql/pglite-socket';
import {createPublicClient,http} from 'viem';
const config=JSON.parse(await readFile('.anvil/session.json','utf8'));
if(!['localhost','127.0.0.1','[::1]'].includes(new URL(config.rpc).hostname))throw new Error('The local test launcher cannot use a remote RPC');
if(await createPublicClient({transport:http(config.rpc)}).getChainId()!==31337)throw new Error('Start Anvil chain 31337 first');
const databaseDir=process.argv.includes('--fresh')?`.anvil/databases/session-${Date.now()}`:'.anvil/database';
await mkdir(databaseDir,{recursive:true});const db=await PGlite.create(databaseDir);
await db.exec('CREATE TABLE IF NOT EXISTS "MemoryLocalMigration" (name text PRIMARY KEY)');
for(const name of (await readdir('prisma/migrations')).filter(n=>/^\d/.test(n)).sort()){
 const seen=await db.query('SELECT name FROM "MemoryLocalMigration" WHERE name=$1',[name]);
 if(!seen.rows.length)await db.transaction(async tx=>{await tx.exec(await readFile(`prisma/migrations/${name}/migration.sql`,'utf8'));await tx.query('INSERT INTO "MemoryLocalMigration" VALUES ($1)',[name]);});
}
const dbPort=Number(process.env.ANVIL_DB_PORT||54329);const appPort=Number(process.env.ANVIL_APP_PORT||3102);
const server=new PGLiteSocketServer({db,host:'127.0.0.1',port:dbPort});await server.start();
const env={...process.env,DATABASE_URL:`postgresql://postgres:postgres@127.0.0.1:${dbPort}/postgres?sslmode=disable&connection_limit=1&pool_timeout=30`,APP_URL:`http://localhost:${appPort}`,NEXT_PUBLIC_AUCTION_NETWORK:'anvil',NEXT_PUBLIC_ANVIL_RPC_URL:config.rpc,NEXT_PUBLIC_ANVIL_USDC_ADDRESS:config.token,ANVIL_TEST_MODE:'true',ANVIL_COUNTDOWN_SECONDS:process.env.ANVIL_COUNTDOWN_SECONDS||'60',BASE_TREASURY_ADDRESS:config.treasury,AUCTION_ADMIN_WALLETS:config.treasury,AUCTIONS_ENABLED:'true',DESIGN_PREVIEW_ENABLED:'true'};
// Test-only connection details; no keys and no shared database configuration.
await writeRuntime();
async function writeRuntime(){const {writeFile}=await import('node:fs/promises');await writeFile('.anvil/runtime.json',JSON.stringify({appUrl:env.APP_URL,countdownSeconds:Number(env.ANVIL_COUNTDOWN_SECONDS),...config},null,2)+'\n');}
const child=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--webpack','--port',String(appPort)],{env,stdio:'inherit'});
console.log(`ISOLATED ANVIL TEST: ${env.APP_URL} — mock USDC only. The 24-hour clock lasts ${env.ANVIL_COUNTDOWN_SECONDS} seconds.`);
let stopping=false;async function stop(){if(stopping)return;stopping=true;child.kill('SIGTERM');await server.stop();await db.close();}
process.on('SIGINT',()=>stop().then(()=>process.exit(0)));process.on('SIGTERM',()=>stop().then(()=>process.exit(0)));child.on('exit',()=>stop().then(()=>process.exit(0)));
