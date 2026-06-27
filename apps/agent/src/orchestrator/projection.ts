/**
 * The proxy projection: turn a user's H100 hedge intent into a validated,
 * executable order on a USDC venue.
 *
 * Pass 1 (index economics): build the H100 plan with the user's hedge ratio h
 * against the live H100 index (synthetic deep depth — H100 is paused). Yields
 * notional + H100 carry/liq for DISPLAY.
 * Pass 2 (venue execution): re-express that notional on the real venue by
 * feeding {monthlySpendQuote: indexNotional, hedgeRatio: 1} into the SAME risk
 * engine → venueSize = notional / P_venue, fully validated (margin vs bank
 * USDC, slippage, liquidity, liq-buffer). h is applied exactly once.
 *
 * Fallback to the next venue ONLY when the sole blocker is TooThinLiquidity.
 */
import { getMarketProfile, type HedgeRoute } from '@compation/shared';
import {
  assessHedge,
  buildHedgePlan,
  type HedgeIntent,
  type HedgePlan,
  type ValidationResult,
  type AccountState,
} from '../risk/index';
import { toMarketParams, deepDepthAt, type InjectiveExecutor } from '../injective/index';

export interface ProjectionResult {
  indexKey: string;
  indexPlan: HedgePlan; // H100 economics (display)
  venueKey: string; // which venue won (or was last tried)
  venue: ValidationResult; // validated venue plan (ok) or errors
  attempted: string[];
  proxy: boolean;
}

export async function projectHedge(
  intent: HedgeIntent,
  route: HedgeRoute,
  executor: InjectiveExecutor,
  account: AccountState,
): Promise<ProjectionResult> {
  // ---- Pass 1: H100 economics ----
  const indexProfile = getMarketProfile(route.indexKey);
  const indexPrice = await executor.getIndexPrice(route.indexKey);
  const indexParams = toMarketParams(indexProfile, indexPrice, /* funding */ 0);
  const indexPlan = buildHedgePlan(intent, indexParams, deepDepthAt(indexPrice), account);

  // ---- Pass 2: venue execution (primary, then fallbacks) ----
  const venueKeys = [route.primaryVenueKey, ...route.fallbackVenueKeys];
  const attempted: string[] = [];
  let last: ValidationResult | null = null;
  let lastKey = route.primaryVenueKey;

  for (const venueKey of venueKeys) {
    attempted.push(venueKey);
    lastKey = venueKey;
    const venueProfile = getMarketProfile(venueKey);
    const { price, fundingRateHourly } = await executor.getVenue(venueKey);
    const depth = await executor.getOrderbookDepth(venueKey);
    const venueParams = toMarketParams(venueProfile, price, fundingRateHourly);

    const venueIntent: HedgeIntent = {
      monthlySpendQuote: indexPlan.notional, // re-express the hedged notional...
      hedgeRatio: 1, // ...do NOT re-apply h
      horizonMonths: intent.horizonMonths,
      leverage: intent.leverage,
      liquidationBufferMin: intent.liquidationBufferMin,
      maxSlippage: intent.maxSlippage,
    };
    const vr = assessHedge(venueIntent, venueParams, depth, account);
    last = vr;
    if (vr.ok) {
      return { indexKey: route.indexKey, indexPlan, venueKey, venue: vr, attempted, proxy: route.proxy };
    }
    // Only thin liquidity justifies trying another venue; account problems surface as-is.
    const onlyThin = vr.errors.length > 0 && vr.errors.every((e) => e.code === 'TooThinLiquidity');
    if (!onlyThin) break;
  }

  return { indexKey: route.indexKey, indexPlan, venueKey: lastKey, venue: last!, attempted, proxy: route.proxy };
}
