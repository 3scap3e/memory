import {execFileSync} from 'node:child_process';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {homedir} from 'node:os';
import {createPublicClient,createWalletClient,defineChain,http} from 'viem';
const rpc=process.env.ANVIL_RPC_URL||'http://127.0.0.1:8545';
if(!['localhost','127.0.0.1','[::1]'].includes(new URL(rpc).hostname))throw new Error('Setup only supports a local Anvil RPC');
const chain=defineChain({id:31337,name:'Memory Anvil',nativeCurrency:{name:'Test Ether',symbol:'ETH',decimals:18},rpcUrls:{default:{http:[rpc]}}});
const publicClient=createPublicClient({chain,transport:http(rpc)});
if(await publicClient.getChainId()!==31337)throw new Error('Refusing to deploy outside Anvil chain 31337');
const accounts=await publicClient.request({method:'eth_accounts'});
if(accounts.length<4)throw new Error('Anvil must expose at least four unlocked test accounts');
const foundry=process.env.FOUNDRY_FORGE||(existsSync(`${homedir()}/.foundry/bin/forge`)?`${homedir()}/.foundry/bin/forge`:'forge');
execFileSync(foundry,['build','--root','tests/anvil'],{stdio:'inherit'});
const artifact=JSON.parse(await readFile('tests/anvil/out/MockUSDC.sol/MockUSDC.json','utf8'));
const owner=createWalletClient({chain,account:accounts[0],transport:http(rpc)});
const hash=await owner.deployContract({abi:artifact.abi,bytecode:artifact.bytecode.object});
const receipt=await publicClient.waitForTransactionReceipt({hash});
if(!receipt.contractAddress)throw new Error('Mock token deployment failed');
for(const address of accounts.slice(1,4)){
 const tx=await owner.writeContract({address:receipt.contractAddress,abi:artifact.abi,functionName:'mint',args:[address,10_000_000_000n]});
 await publicClient.waitForTransactionReceipt({hash:tx});
}
await mkdir('.anvil',{recursive:true});
await writeFile('.anvil/session.json',JSON.stringify({rpc,token:receipt.contractAddress,treasury:accounts[0],bidders:accounts.slice(1,4)},null,2)+'\n');
console.log(`Mock USDC deployed: ${receipt.contractAddress}`);
console.log(`Owner/treasury: ${accounts[0]}`);
accounts.slice(1,4).forEach((a,i)=>console.log(`Bidder ${'ABC'[i]}: ${a} — 10,000 mock USDC`));
console.log('Next: npm run dev:anvil. Use the public Anvil test accounts in your wallet. Never use these accounts for real funds.');
