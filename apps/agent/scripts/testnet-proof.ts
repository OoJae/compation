/**
 * Phase 0.2 — prove the signing → broadcast → finality path on TESTNET with
 * two REAL transactions: a subaccount deposit then withdraw of a tiny INJ
 * amount (the exact primitives the executor uses to fund/defund a trading
 * subaccount). Needs only faucet INJ — no stablecoin, no order book.
 *
 * Run: pnpm --filter @compation/agent testnet:proof
 */
import { loadEnv } from './_shared';
loadEnv();

import {
  PrivateKey,
  MsgBroadcasterWithPk,
  MsgDeposit,
  MsgWithdraw,
  ChainGrpcBankApi,
} from '@injectivelabs/sdk-ts';
import { getNetworkEndpoints, Network } from '@injectivelabs/networks';
import { explorerTxUrl } from '@compation/shared';

const PK_HEX = process.env.INJECTIVE_PRIVATE_KEY;
const ADDR = process.env.INJECTIVE_WALLET_ADDRESS;
const DENOM = 'inj';
const DECIMALS = 18;
const AMOUNT = '0.05'; // INJ to round-trip through the subaccount

/** Human decimal string → integer base-units string (BigInt-safe). */
function toBaseUnits(amount: string, decimals: number): string {
  const [int, frac = ''] = amount.split('.');
  const fracPadded = (frac + '0'.repeat(decimals)).slice(0, decimals);
  const combined = `${int}${fracPadded}`.replace(/^0+/, '');
  return combined === '' ? '0' : combined;
}

async function main(): Promise<void> {
  if (!PK_HEX || !ADDR) {
    console.error('Missing wallet in .env. Run: pnpm --filter @compation/agent wallet:gen');
    process.exit(1);
  }

  const endpoints = getNetworkEndpoints(Network.Testnet);
  const bank = new ChainGrpcBankApi(endpoints.grpc);

  // Gas + amount check
  const { amount: injRaw } = await bank.fetchBalance({ accountAddress: ADDR, denom: DENOM });
  const injHuman = Number(injRaw) / 10 ** DECIMALS;
  console.log(`testnet INJ balance: ${injHuman}`);
  if (injHuman < 0.1) {
    console.error(
      `\nNeed ≥ 0.1 testnet INJ (have ${injHuman}). Fund first:\n` +
        `  → https://testnet.faucet.injective.network/  (paste ${ADDR})`,
    );
    process.exit(1);
  }

  const pk = PrivateKey.fromHex(PK_HEX);
  // NOTE: subaccount index 0 (the "default") IS the bank balance — you cannot
  // MsgDeposit into it (trading from it draws straight from bank). Explicit
  // deposit/withdraw only works for NON-default subaccounts, so we use index 1.
  const subaccountId = pk.toAddress().getSubaccountId(1);
  const broadcaster = new MsgBroadcasterWithPk({
    network: Network.TestnetSentry,
    privateKey: pk,
    simulateTx: true,
    gasBufferCoefficient: 1.3,
  });
  const chainAmount = toBaseUnits(AMOUNT, DECIMALS);
  console.log(`subaccount: ${subaccountId}`);

  // TX 1 — deposit bank → subaccount
  console.log(`\n[1/2] depositing ${AMOUNT} INJ → subaccount …`);
  const dep = (await broadcaster.broadcast({
    msgs: [MsgDeposit.fromJSON({ injectiveAddress: ADDR, subaccountId, amount: { denom: DENOM, amount: chainAmount } })],
    memo: 'Compation testnet signing proof — deposit',
  })) as { txHash: string };
  console.log(`   ✅ txHash: ${dep.txHash}`);
  console.log(`   ${explorerTxUrl('testnet', dep.txHash)}`);

  // TX 2 — withdraw subaccount → bank
  console.log(`\n[2/2] withdrawing ${AMOUNT} INJ → bank …`);
  const wd = (await broadcaster.broadcast({
    msgs: [MsgWithdraw.fromJSON({ injectiveAddress: ADDR, subaccountId, amount: { denom: DENOM, amount: chainAmount } })],
    memo: 'Compation testnet signing proof — withdraw',
  })) as { txHash: string };
  console.log(`   ✅ txHash: ${wd.txHash}`);
  console.log(`   ${explorerTxUrl('testnet', wd.txHash)}`);

  console.log('\n✅ Signing → broadcast → finality verified on Injective testnet (2 real txs).');
}

main().catch((e) => {
  console.error('\nFATAL:', (e as Error)?.message ?? e);
  process.exit(1);
});
