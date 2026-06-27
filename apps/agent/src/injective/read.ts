/**
 * Key-less, read-only chain reads for the UI (no signer required) — so the
 * dashboard can show the REAL live H100 index even when EXECUTOR=fake.
 */
import { IndexerGrpcOracleApi } from '@injectivelabs/sdk-ts';
import { getNetworkEndpoints, Network } from '@injectivelabs/networks';
import { getMarketProfile } from '@compation/shared';

/** Live oracle/index price for a market key (e.g. the H100 Stork index), human units. */
export async function readIndexPrice(indexKey: string): Promise<number> {
  const p = getMarketProfile(indexKey);
  const ep = getNetworkEndpoints(p.network === 'mainnet' ? Network.Mainnet : Network.Testnet);
  const oracle = new IndexerGrpcOracleApi(ep.indexer);
  const r = (await oracle.fetchOraclePriceNoThrow({
    baseSymbol: p.oracleBase,
    quoteSymbol: p.oracleQuote,
    oracleType: p.oracleType,
  } as never)) as { price?: string };
  return Number(r?.price ?? 0);
}
