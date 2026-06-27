import type { PlanError } from './errors';

/** Live market microstructure the engine needs. All values in human decimals. */
export interface MarketParams {
  /** P — current H100 hourly index price (quote per H100-hour-equivalent). */
  price: number;
  /** Market max leverage (e.g. 5 for H100). */
  maxLeverage: number;
  /** Minimum price increment. */
  tickSize: number;
  /** Minimum size increment. */
  minQuantityTick: number;
  /** Exchange-enforced minimum notional (quote). */
  minNotional: number;
  /** Taker fee as a fraction (e.g. 0.0006). */
  takerFeeRate: number;
  /** Hourly funding as a fraction; positive ⇒ longs pay shorts. */
  fundingRateHourly: number;
  /** Maintenance margin rate as a fraction (e.g. 0.05). */
  maintenanceMarginRate: number;
}

export interface DepthLevel {
  price: number;
  quantity: number;
}

/** Order book. `asks` ascending from best — what a long (buy) walks. */
export interface OrderbookDepth {
  asks: DepthLevel[];
}

export interface AccountState {
  /** Available collateral (quote, e.g. USDT). */
  availableQuote: number;
  /** Keep-back buffer not committed to margin. */
  safetyReserveQuote: number;
}

/**
 * What the model is allowed to express: INTENT only. There is deliberately no
 * size/notional/margin field here — the model never sizes a position.
 */
export interface HedgeIntent {
  /** Q given directly as H100-hours over the horizon … */
  monthlyHours?: number;
  /** … or as spend, from which Q = spend / price is derived. */
  monthlySpendQuote?: number;
  /** h — hedge ratio in (0, 1]. */
  hedgeRatio: number;
  /** Hedge horizon in months (informational + carry horizon). */
  horizonMonths: number;
  /** Requested leverage (clamped to market max with a warning). */
  leverage: number;
  /** Minimum required distance from liquidation, as a fraction (e.g. 0.40). */
  liquidationBufferMin: number;
  /** Maximum acceptable slippage when opening, as a fraction (e.g. 0.005). */
  maxSlippage: number;
}

export interface SlippageEstimate {
  /** Volume-weighted average fill price across the walked book. */
  avgFillPrice: number;
  /** Slippage vs best ask, as a fraction. `Infinity` if nothing fillable. */
  slippagePct: number;
  /** How much of the target the book can actually fill at any price. */
  fillableQuantity: number;
}

export interface FundingCarryEstimate {
  hourlyCarry: number;
  monthlyCarry: number;
  horizonCarry: number;
  /** Who pays the funding given the current rate sign. */
  payer: 'long' | 'short';
}

export interface PlanWarning {
  code: string;
  message: string;
  detail?: Record<string, unknown>;
}

/** The fully-computed hedge. Every number here comes from the engine, never the model. */
export interface HedgePlan {
  // exposure & sizing
  /** Q — exposure in H100-hour-equivalents over the horizon. */
  exposureHours: number;
  /** S = h · Q — ideal (unquantized) hedge size. */
  idealSize: number;
  /** S after rounding to the market's size grid (and minNotional clamp). */
  size: number;

  // pricing
  entryPrice: number;
  notional: number;
  margin: number;
  leverage: number;

  // risk
  estLiquidationPrice: number;
  liquidationBufferPct: number;
  maintenanceMarginRate: number;

  // execution quality
  estAvgFillPrice: number;
  estSlippagePct: number;
  fillableQuantity: number;

  // carry & fees
  estHourlyCarry: number;
  estMonthlyCarry: number;
  estHorizonCarry: number;
  carryPayer: 'long' | 'short';
  takerFeeQuote: number;

  // meta / thresholds (carried so validation is self-contained)
  hedgeRatio: number;
  horizonMonths: number;
  liquidationBufferMin: number;
  maxSlippage: number;

  warnings: PlanWarning[];
}

export interface ValidationResult {
  ok: boolean;
  /** Present iff `ok`. */
  plan?: HedgePlan;
  /** ALL violations (we collect, never fail-fast). */
  errors: PlanError[];
  warnings: PlanWarning[];
}
