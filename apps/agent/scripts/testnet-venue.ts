/** Phase 0.1 — capture active TESTNET USDC perp params for the dev venue. Read-only. */
import { IndexerGrpcDerivativesApi, IndexerGrpcOracleApi } from '@injectivelabs/sdk-ts';
import { getNetworkEndpoints, Network } from '@injectivelabs/networks';

const endpoints = getNetworkEndpoints(Network.Testnet);
const deriv = new IndexerGrpcDerivativesApi(endpoints.indexer);
const oracle = new IndexerGrpcOracleApi(endpoints.indexer);

async function dump(needle: string) {
  const markets = (await deriv.fetchMarkets({ marketStatus: 'active' })) as unknown as any[];
  const m = markets.find((mm) => (mm.ticker ?? '').toUpperCase().includes(needle.toUpperCase()));
  if (!m) return console.log(`[${needle}] not active on testnet`);
  console.log(`\n===== TESTNET ${m.ticker} (${m.marketStatus}) =====`);
  console.log(JSON.stringify({
    ticker: m.ticker, marketId: m.marketId, quoteDenom: m.quoteDenom,
    quoteSymbol: m.quoteToken?.symbol, quoteDecimals: m.quoteToken?.decimals,
    oracleBase: m.oracleBase, oracleQuote: m.oracleQuote, oracleType: m.oracleType,
    initialMarginRatio: m.initialMarginRatio, maintenanceMarginRatio: m.maintenanceMarginRatio,
    makerFeeRate: m.makerFeeRate, takerFeeRate: m.takerFeeRate,
    minPriceTickSize: m.minPriceTickSize, minQuantityTickSize: m.minQuantityTickSize,
    minNotional: m.minNotional,
  }, null, 2));
  try {
    const p = await oracle.fetchOraclePriceNoThrow({ baseSymbol: m.oracleBase, quoteSymbol: m.oracleQuote, oracleType: m.oracleType } as any);
    console.log(`  oracle price:`, JSON.stringify(p));
  } catch (e) { console.log('  oracle err', (e as Error)?.message); }
  try {
    const ob = (await deriv.fetchOrderbookV2(m.marketId)) as any;
    const qd = Number(m.quoteToken?.decimals ?? 6);
    const h = (x?: string) => (x == null ? null : Number(x) / 10 ** qd);
    console.log(`  book: ${ob.buys?.length ?? 0} bids / ${ob.sells?.length ?? 0} asks; bestBid=${h(ob.buys?.[0]?.price)} bestAsk=${h(ob.sells?.[0]?.price)}`);
  } catch (e) { console.log('  book err', (e as Error)?.message); }
}

async function main() {
  await dump('INJ/USDC');
  await dump('BTC/USDC');
  await dump('ETH/USDC');
  console.log('\n=== testnet venue probe complete ===');
}
main().catch((e) => { console.error('FATAL', e); process.exit(1); });
