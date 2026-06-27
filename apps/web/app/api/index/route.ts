import { readIndexPrice } from '@compation/agent';
import { getMarketProfile } from '@compation/shared';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Live H100 rental-rate index (real on-chain oracle; key-less). */
export async function GET(): Promise<Response> {
  const indexKey = 'mainnet:H100';
  try {
    const h100Index = await readIndexPrice(indexKey);
    return Response.json({ h100Index, ticker: getMarketProfile(indexKey).marketTicker, at: Date.now() });
  } catch {
    return Response.json({ h100Index: null, ticker: 'H100/USDT PERP', at: Date.now() });
  }
}
