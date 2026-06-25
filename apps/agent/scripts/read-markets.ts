/**
 * Phase 0.1 — READ-ONLY validation spike (costs $0, no wallet, no approval).
 *
 * Reads the H100 perp on MAINNET and the candidate dev perps on TESTNET via
 * @injectivelabs/sdk-ts, dumping the authoritative market microstructure
 * (marketId, tick sizes, minNotional, quote denom/decimals, fees, margin
 * ratios, funding) we need to fill packages/shared/src/markets.ts — and proves
 * the gating decision: "is H100 live and priced on mainnet?".
 *
 * Run: pnpm --filter @compation/agent spike:read
 */
import { IndexerGrpcDerivativesApi } from '@injectivelabs/sdk-ts';
import { getNetworkEndpoints, Network } from '@injectivelabs/networks';

type AnyMarket = Record<string, unknown> & {
  marketId: string;
  ticker?: string;
  quoteToken?: { decimals?: number; symbol?: string } | null;
};

function pick(m: AnyMarket) {
  return {
    ticker: m.ticker,
    marketId: m.marketId,
    marketStatus: m['marketStatus'],
    oracleBase: m['oracleBase'],
    oracleQuote: m['oracleQuote'],
    oracleType: m['oracleType'],
    oracleScaleFactor: m['oracleScaleFactor'],
    quoteDenom: m['quoteDenom'],
    quoteSymbol: m.quoteToken?.symbol,
    quoteDecimals: m.quoteToken?.decimals,
    initialMarginRatio: m['initialMarginRatio'],
    maintenanceMarginRatio: m['maintenanceMarginRatio'],
    makerFeeRate: m['makerFeeRate'],
    takerFeeRate: m['takerFeeRate'],
    minPriceTickSize: m['minPriceTickSize'],
    minQuantityTickSize: m['minQuantityTickSize'],
    minNotional: m['minNotional'],
    isPerpetual: m['isPerpetual'],
    perpetualMarketInfo: m['perpetualMarketInfo'],
    perpetualMarketFunding: m['perpetualMarketFunding'],
  };
}

async function dump(label: string, network: Network, needles: string[]) {
  const endpoints = getNetworkEndpoints(network);
  console.log(`\n================ ${label} ================`);
  console.log(`indexer: ${endpoints.indexer}`);
  const api = new IndexerGrpcDerivativesApi(endpoints.indexer);

  let markets: AnyMarket[];
  try {
    markets = (await api.fetchMarkets()) as unknown as AnyMarket[];
  } catch (err) {
    console.log(`  ERROR fetchMarkets: ${(err as Error)?.message ?? err}`);
    return;
  }
  console.log(`  ${markets.length} derivative markets returned`);

  for (const needle of needles) {
    const m = markets.find((mm) =>
      (mm.ticker ?? '').toUpperCase().includes(needle.toUpperCase()),
    );
    if (!m) {
      console.log(`\n  [${needle}] NOT FOUND`);
      continue;
    }
    console.log(`\n  --- ${needle} → ${m.ticker} ---`);
    console.log(JSON.stringify(pick(m), null, 2));

    const qd = Number(m.quoteToken?.decimals ?? 6);
    try {
      const ob = (await api.fetchOrderbookV2(m.marketId)) as unknown as {
        buys?: { price: string; quantity: string }[];
        sells?: { price: string; quantity: string }[];
      };
      const topBuy = ob.buys?.[0];
      const topSell = ob.sells?.[0];
      const human = (p?: string) =>
        p == null ? null : Number(p) / 10 ** qd;
      console.log(
        `  top-of-book  bestBid=${topBuy?.price} (~${human(topBuy?.price)})  ` +
          `bestAsk=${topSell?.price} (~${human(topSell?.price)})  [÷10^${qd}]`,
      );
      console.log(
        `  depth: ${ob.buys?.length ?? 0} bids / ${ob.sells?.length ?? 0} asks`,
      );
    } catch (err) {
      console.log(`  orderbook error: ${(err as Error)?.message ?? err}`);
    }
  }

  // Help locate exact tickers (e.g. how H100 is actually named).
  const sample = markets
    .map((m) => m.ticker)
    .filter(Boolean)
    .sort();
  console.log(`\n  all ${label} tickers (${sample.length}):`);
  console.log('   ' + sample.join(' | '));
}

async function main() {
  await dump('MAINNET', Network.Mainnet, ['H100']);
  await dump('TESTNET', Network.Testnet, ['INJ/USDT', 'BTC/USDT']);
  console.log('\n=== spike read complete ===');
}

main().catch((e) => {
  console.error('FATAL', e);
  process.exit(1);
});
