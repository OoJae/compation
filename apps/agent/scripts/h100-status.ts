/**
 * Phase 0.1 — H100 status detail + active-proxy liquidity check. Read-only.
 * Answers: (1) is the paused H100 market's index price still live? (2) which
 * ACTIVE mainnet USDC perp is the best venue for a tiny real demo trade?
 */
import {
  IndexerGrpcDerivativesApi,
  IndexerGrpcOracleApi,
} from '@injectivelabs/sdk-ts';
import { getNetworkEndpoints, Network } from '@injectivelabs/networks';

const endpoints = getNetworkEndpoints(Network.Mainnet);
const deriv = new IndexerGrpcDerivativesApi(endpoints.indexer);
const oracle = new IndexerGrpcOracleApi(endpoints.indexer);

async function full(needle: string) {
  const markets = (await deriv.fetchMarkets({})) as unknown as any[];
  const paused = (await deriv.fetchMarkets({ marketStatus: 'paused' })) as unknown as any[];
  const all = [...markets, ...paused];
  const m = all.find((mm) => (mm.ticker ?? '').toUpperCase().includes(needle.toUpperCase()));
  if (!m) {
    console.log(`\n[${needle}] not found`);
    return null;
  }
  console.log(`\n===== ${m.ticker} (${m.marketStatus}) =====`);
  console.log(
    JSON.stringify(
      {
        ticker: m.ticker,
        marketId: m.marketId,
        marketStatus: m.marketStatus,
        quoteDenom: m.quoteDenom,
        quoteSymbol: m.quoteToken?.symbol,
        quoteDecimals: m.quoteToken?.decimals,
        oracleBase: m.oracleBase,
        oracleQuote: m.oracleQuote,
        oracleType: m.oracleType,
        oracleScaleFactor: m.oracleScaleFactor,
        initialMarginRatio: m.initialMarginRatio,
        maintenanceMarginRatio: m.maintenanceMarginRatio,
        makerFeeRate: m.makerFeeRate,
        takerFeeRate: m.takerFeeRate,
        minPriceTickSize: m.minPriceTickSize,
        minQuantityTickSize: m.minQuantityTickSize,
        minNotional: m.minNotional,
        perpetualMarketInfo: m.perpetualMarketInfo,
        perpetualMarketFunding: m.perpetualMarketFunding,
      },
      null,
      2,
    ),
  );
  // Is the index/oracle price still live?
  try {
    const price = await oracle.fetchOraclePriceNoThrow({
      baseSymbol: m.oracleBase,
      quoteSymbol: m.oracleQuote,
      oracleType: m.oracleType,
    } as any);
    console.log(`  ORACLE price feed:`, JSON.stringify(price));
  } catch (err) {
    console.log(`  oracle error: ${(err as Error)?.message ?? err}`);
  }
  // Top-of-book liquidity
  try {
    const ob = (await deriv.fetchOrderbookV2(m.marketId)) as any;
    const qd = Number(m.quoteToken?.decimals ?? 6);
    const h = (p?: string) => (p == null ? null : Number(p) / 10 ** qd);
    console.log(
      `  book: ${ob.buys?.length ?? 0} bids / ${ob.sells?.length ?? 0} asks; ` +
        `bestBid=${h(ob.buys?.[0]?.price)} bestAsk=${h(ob.sells?.[0]?.price)}`,
    );
  } catch (err) {
    console.log(`  book error: ${(err as Error)?.message ?? err}`);
  }
  return m;
}

async function main() {
  await full('H100/USDT'); // the paused headline market
  await full('NVDA/USDC'); // active NVIDIA proxy
  await full('BTC/USDC'); // active deep-liquidity reference
  await full('INJ/USDC'); // active native reference
  console.log('\n=== status probe complete ===');
}

main().catch((e) => {
  console.error('FATAL', e);
  process.exit(1);
});
