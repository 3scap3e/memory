import {readFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import nextEnv from '@next/env';
import {fileURLToPath} from 'node:url';
import {createPublicClient,http} from 'viem';
const root=fileURLToPath(new URL('..',import.meta.url));
nextEnv.loadEnvConfig(root,true);
if(!process.env.DATABASE_URL)throw new Error('Configure your shared DATABASE_URL. This launcher no longer creates or selects another database.');
if(process.argv.includes('--fresh'))throw new Error('--fresh is disabled: shared database records will not be reset.');
const config=JSON.parse(await readFile(new URL('../.anvil/session.json',import.meta.url),'utf8'));
if(!['localhost','127.0.0.1','[::1]'].includes(new URL(config.rpc).hostname))throw new Error('Anvil requires a local RPC');
if(await createPublicClient({transport:http(config.rpc)}).getChainId()!==31337)throw new Error('Start Anvil chain 31337 first');
// Anvil changes only payment-network settings. DATABASE_URL is inherited.
// Do not run this against an auction that is accepting live Base bids.
const port=Number(process.env.ANVIL_APP_PORT||3102);
const environment={...process.env,APP_URL:`http://localhost:${port}`,NEXT_PUBLIC_AUCTION_NETWORK:'anvil',NEXT_PUBLIC_ANVIL_RPC_URL:config.rpc,NEXT_PUBLIC_ANVIL_USDC_ADDRESS:config.token,ANVIL_TEST_MODE:'true',ANVIL_COUNTDOWN_SECONDS:'86400',AUCTIONS_ENABLED:process.env.ANVIL_BIDDING_ENABLED==='true'?'true':'false',BASE_TREASURY_ADDRESS:config.treasury,AUCTION_ADMIN_WALLETS:config.treasury};
const child=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--webpack','--port',String(port)],{cwd:root,env:environment,stdio:'inherit'});
console.log('Anvil payment network selected. Database uses your configured DATABASE_URL; no separate database or migrations are created.');
process.on('SIGINT',()=>child.kill('SIGINT'));process.on('SIGTERM',()=>child.kill('SIGTERM'));child.on('exit',code=>process.exit(code??0));
