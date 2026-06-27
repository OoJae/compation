/**
 * Phase 2 x402 spike — does a REAL testnet x402 micropayment settle end-to-end
 * with our wallet? Stands up a gated "H100 risk signal" endpoint (facilitator =
 * our key, pays gas) and has the x402 client (our key) pay it on testnet.
 *
 * Run: pnpm --filter @compation/agent exec tsx scripts/x402-spike.ts
 */
import { loadEnv } from './_shared';
loadEnv();

import express from 'express';
import { injectivePaymentMiddleware } from '@injectivelabs/x402/middleware';
import { createInjectiveClient, parsePaymentResponseHeader } from '@injectivelabs/x402/client';
import { INJECTIVE_TESTNET_CAIP2 } from '@injectivelabs/x402/networks';

const PK = process.env.INJECTIVE_PRIVATE_KEY as `0x${string}`;
const TESTNET_USDC = '0x0C382e685bbeeFE5d3d9C29e29E341fEE8E84C5d' as const; // Circle FiatTokenV2_2 (EIP-3009)
const PORT = 4023;
const AMOUNT = '10000'; // 0.01 USDC (6 decimals)

async function main() {
  if (!PK) throw new Error('INJECTIVE_PRIVATE_KEY missing');

  const app = express();
  app.use(
    injectivePaymentMiddleware(
      {
        'GET /signal': {
          description: 'Compation H100 compute-risk signal',
          accepts: [{ network: INJECTIVE_TESTNET_CAIP2, asset: TESTNET_USDC, amount: AMOUNT }],
        },
      },
      { facilitator: { privateKey: PK }, settlementPolicy: 'after-success' },
    ),
  );
  app.get('/signal', (_req, res) => {
    res.json({ signal: 'H100 compute-risk', h100Index: 2.85, volatility24h: 0.12, ts: Date.now() });
  });
  const server = app.listen(PORT, '127.0.0.1');
  console.log(`gated endpoint up on 127.0.0.1:${PORT} (0.01 testnet USDC via x402)`);

  try {
    const client = createInjectiveClient({ privateKey: PK });
    const t0 = Date.now();
    console.log('agent paying for the H100 signal...');
    const res = await client.fetch(`http://127.0.0.1:${PORT}/signal`);
    const ms = Date.now() - t0;
    const body = await res.json();
    const receipt = parsePaymentResponseHeader(res);
    console.log(`\nHTTP ${res.status} in ${ms}ms`);
    console.log('signal:', JSON.stringify(body));
    console.log('receipt:', JSON.stringify(receipt));
    if (receipt?.success) {
      console.log(`\n✅ x402 settled on testnet — tx ${receipt.transaction}`);
      console.log(`   https://testnet.blockscout.injective.network/tx/${receipt.transaction}`);
    } else {
      console.log('\n⚠️ no settlement receipt (see status/body above)');
    }
  } catch (e) {
    const err = e as Error & { cause?: unknown };
    console.error('\n❌ x402 FAILED:', err?.message ?? e);
    if (err?.cause) console.error('   cause:', err.cause);
  } finally {
    server.close();
  }
}

main().catch((e) => {
  console.error('FATAL', e);
  process.exit(1);
});
