/**
 * Pay the LIVE Injective x402 endpoint (agents.injective.com) with our wallet.
 * It settles on testnet (eip155:1439) with our testnet USDC via THEIR production
 * facilitator — reliable, no mainnet funds.
 *
 * Run: pnpm --filter @compation/agent exec tsx scripts/x402-pay.ts
 */
import { loadEnv } from './_shared';
loadEnv();
import { createInjectiveClient, parsePaymentResponseHeader } from '@injectivelabs/x402/client';

const PK = process.env.INJECTIVE_PRIVATE_KEY as `0x${string}`;
const URL = 'https://agents.injective.com/api/x402/perps/market-data';

async function main() {
  if (!PK) throw new Error('INJECTIVE_PRIVATE_KEY missing');
  const client = createInjectiveClient({ privateKey: PK, preferredNetworks: ['eip155:1439'] });
  console.log(`agent paying ${URL} (0.01 testnet USDC)...`);
  const t0 = Date.now();
  const res = await client.fetch(URL);
  const ms = Date.now() - t0;
  const receipt = parsePaymentResponseHeader(res);
  const body = await res.json().catch(() => null);
  console.log(`\nHTTP ${res.status} in ${ms}ms`);
  console.log('receipt:', JSON.stringify(receipt));
  console.log('data:', JSON.stringify(body).slice(0, 300));
  if (receipt?.success) {
    console.log(`\n✅ x402 settled — tx ${receipt.transaction}`);
    console.log(`   https://testnet.blockscout.injective.network/tx/${receipt.transaction}`);
  }
}
main().catch((e) => {
  const err = e as Error & { cause?: unknown };
  console.error('❌ FAILED:', err?.message ?? e);
  if (err?.cause) console.error('   cause:', String(err.cause).slice(0, 300));
  process.exit(1);
});
