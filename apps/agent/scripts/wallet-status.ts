/**
 * Show the agent wallet's balances on testnet + mainnet, and what still needs
 * funding. Read-only. Run: pnpm --filter @compation/agent wallet:status
 */
import { loadEnv, humanizeAmount } from './_shared.js';
loadEnv();

import {
  ChainGrpcBankApi,
  IndexerGrpcAccountPortfolioApi,
} from '@injectivelabs/sdk-ts';
import { getNetworkEndpoints, Network } from '@injectivelabs/networks';

const ADDR = process.env.INJECTIVE_WALLET_ADDRESS;

async function status(label: string, network: Network): Promise<void> {
  const ep = getNetworkEndpoints(network);
  console.log(`\n=== ${label} ===`);
  // Bank balances
  try {
    const bank = new ChainGrpcBankApi(ep.grpc);
    const { balances } = await bank.fetchBalances(ADDR!);
    if (!balances.length) console.log('  bank: (empty)');
    for (const b of balances) console.log(`  bank: ${humanizeAmount(b.amount, b.denom)}  [${b.denom}]`);
  } catch (e) {
    console.log(`  bank: error ${(e as Error)?.message ?? e}`);
  }
  // Subaccount (trading) deposits
  try {
    const portfolio = new IndexerGrpcAccountPortfolioApi(ep.indexer);
    const p = (await portfolio.fetchAccountPortfolioBalances(ADDR!)) as unknown as {
      subaccountsList?: { denom: string; deposit?: { availableBalance?: string; totalBalance?: string } }[];
    };
    const subs = p.subaccountsList ?? [];
    if (!subs.length) console.log('  subaccount: (no deposits)');
    for (const s of subs) {
      console.log(
        `  subaccount: avail ${humanizeAmount(s.deposit?.availableBalance ?? '0', s.denom)} / ` +
          `total ${humanizeAmount(s.deposit?.totalBalance ?? '0', s.denom)}  [${s.denom}]`,
      );
    }
  } catch (e) {
    console.log(`  subaccount: error ${(e as Error)?.message ?? e}`);
  }
}

async function main(): Promise<void> {
  if (!ADDR) {
    console.error('No INJECTIVE_WALLET_ADDRESS in .env. Run: pnpm --filter @compation/agent wallet:gen');
    process.exit(1);
  }
  console.log(`Agent wallet: ${ADDR}`);
  await status('TESTNET', Network.Testnet);
  await status('MAINNET', Network.Mainnet);

  console.log('\n--- funding ---');
  console.log('  TESTNET (free): paste the address at https://testnet.faucet.injective.network/ (gives testnet INJ for gas + margin).');
  console.log('  MAINNET (real, later, gated): send ~$25–40 USDC (collateral) + ~2–3 INJ (gas) + ~$1 USDC (x402) to the address above.');
  console.log('  Note: NVDA/USDC + INJ/USDC margin is USDC; gas is always INJ.');
}

main().catch((e) => {
  console.error('FATAL', (e as Error)?.message ?? e);
  process.exit(1);
});
