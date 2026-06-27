import { readIndexPrice } from '@compation/agent';
import { getMarketProfile } from '@compation/shared';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Dedupe the oracle read across requests on a warm instance — the dashboard polls
// every ~10s per open tab, but they can all share one read.
const TTL_MS = 10_000;
let cache: { value: { h100Index: number | null; ticker: string }; at: number } | null = null;

/** Live H100 rental-rate index (real on-chain oracle; key-less). */
export async function GET(): Promise<Response> {
  const indexKey = 'mainnet:H100';
  const now = Date.now();
  if (cache && now - cache.at < TTL_MS) {
    return Response.json({ ...cache.value, at: cache.at, cached: true });
  }
  try {
    const h100Index = await readIndexPrice(indexKey);
    const value = { h100Index, ticker: getMarketProfile(indexKey).marketTicker };
    cache = { value, at: now };
    return Response.json({ ...value, at: now });
  } catch {
    return Response.json({ h100Index: null, ticker: 'H100/USDT PERP', at: now });
  }
}
