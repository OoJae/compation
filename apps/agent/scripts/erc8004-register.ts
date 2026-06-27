/**
 * Register Compation's ERC-8004 identity on Injective testnet (the
 * IdentityRegistry proxy 0x8004A818… is verified to have code on chain 1439).
 * Permissionless register(string agentURI) → agentId; agentURI is a self-
 * contained data: URI agent card. On success, prints the tx + token id to put
 * in .env (ERC8004_TX_HASH / ERC8004_TOKEN_ID) so the UI badge shows it.
 *
 * Run: pnpm --filter @compation/agent exec tsx scripts/erc8004-register.ts
 */
import { loadEnv } from './_shared';
loadEnv();
import { createWalletClient, createPublicClient, http, parseEventLogs, type Abi } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { injectiveEvmTestnet } from '@injectivelabs/x402/networks';

const PK = process.env.INJECTIVE_PRIVATE_KEY as `0x${string}`;
const REGISTRY = '0x8004A818BFB912233c491871b3d84c89A494BD9e' as const;

const ABI = [
  { type: 'function', name: 'register', stateMutability: 'nonpayable', inputs: [{ name: 'agentURI', type: 'string' }], outputs: [{ name: 'agentId', type: 'uint256' }] },
  { type: 'function', name: 'register', stateMutability: 'nonpayable', inputs: [], outputs: [{ name: 'agentId', type: 'uint256' }] },
  { type: 'event', name: 'Registered', inputs: [{ name: 'agentId', type: 'uint256', indexed: true }, { name: 'agentURI', type: 'string', indexed: false }, { name: 'owner', type: 'address', indexed: true }] },
  { type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }], outputs: [{ type: 'uint256' }] },
] as const satisfies Abi;

async function main() {
  if (!PK) throw new Error('INJECTIVE_PRIVATE_KEY missing');
  const account = privateKeyToAccount(PK);
  const wallet = createWalletClient({ account, chain: injectiveEvmTestnet, transport: http() });
  const pub = createPublicClient({ chain: injectiveEvmTestnet, transport: http() });
  console.log('registering as', account.address, 'on ERC-8004', REGISTRY);

  const card = {
    name: 'Compation',
    description: 'Autonomous AI agent that hedges NVIDIA H100 GPU compute costs on Injective.',
    type: 'trading',
    address: account.address,
  };
  const agentURI = `data:application/json;base64,${Buffer.from(JSON.stringify(card)).toString('base64')}`;

  try {
    const hash = await wallet.writeContract({ address: REGISTRY, abi: ABI, functionName: 'register', args: [agentURI] });
    console.log('register tx:', hash);
    const receipt = await pub.waitForTransactionReceipt({ hash });
    console.log('status:', receipt.status, 'block:', receipt.blockNumber);
    const logs = parseEventLogs({ abi: ABI, eventName: 'Registered', logs: receipt.logs });
    const agentId = logs[0]?.args?.agentId;
    console.log('\n✅ REGISTERED');
    console.log('   agentId (token):', agentId?.toString());
    console.log('   tx:', hash);
    console.log('   https://testnet.blockscout.injective.network/tx/' + hash);
    console.log('\n   add to .env:');
    console.log('   ERC8004_TOKEN_ID=' + (agentId?.toString() ?? ''));
    console.log('   ERC8004_TX_HASH=' + hash);
  } catch (e) {
    const err = e as Error & { shortMessage?: string; cause?: unknown };
    console.error('\n❌ register failed:', err?.shortMessage ?? err?.message ?? e);
    if (err?.cause) console.error('   cause:', String(err.cause).slice(0, 300));
  }
}
main().catch((e) => { console.error('FATAL', e); process.exit(1); });
