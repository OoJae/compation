/**
 * Translate between the on-chain world and the risk engine's human-decimal
 * shapes. Keeps the executor and the risk engine decoupled.
 */
import Decimal from 'decimal.js';
import type { MarketProfile } from '@compation/shared';
import type { MarketParams, OrderbookDepth, AccountState, DepthLevel } from '../risk/index.js';

/** MarketProfile + live price/funding → risk-engine MarketParams. */
export function toMarketParams(
  profile: MarketProfile,
  price: number,
  fundingRateHourly: number,
): MarketParams {
  return {
    price,
    maxLeverage: profile.maxLeverage,
    tickSize: profile.tickSize,
    minQuantityTick: profile.minQuantityTick,
    minNotional: profile.minNotional,
    takerFeeRate: profile.takerFeeRate,
    fundingRateHourly,
    maintenanceMarginRate: profile.maintenanceMarginRate,
  };
}

/** Chain orderbook sell levels (price ×10^dec, qty human) → risk-engine asks (human). */
export function chainSellsToDepth(
  sells: { price: string; quantity: string }[],
  quoteDecimals: number,
): OrderbookDepth {
  const scale = new Decimal(10).pow(quoteDecimals);
  const asks: DepthLevel[] = sells.map((l) => ({
    price: new Decimal(l.price).div(scale).toNumber(),
    quantity: new Decimal(l.quantity).toNumber(),
  }));
  return { asks };
}

export function toAccountState(bankQuote: number, safetyReserveQuote: number): AccountState {
  return { availableQuote: bankQuote, safetyReserveQuote };
}

/** A deep synthetic ask book at `price` — used for the H100 index pass (paused, no real book). */
export function deepDepthAt(price: number): OrderbookDepth {
  return { asks: [{ price, quantity: 1e18 }] };
}

/**
 * The worst (last-touched) ask price needed to fully fill `quantity` — the
 * right limit for a market BUY so the whole order fills. Returns null if the
 * book is too thin to fill the quantity.
 */
export function worstFillPrice(asks: DepthLevel[], quantity: number): number | null {
  let remaining = quantity;
  let worst = 0;
  for (const level of asks) {
    if (remaining <= 1e-12) break;
    worst = level.price;
    remaining -= level.quantity;
  }
  return remaining > 1e-9 ? null : worst;
}
