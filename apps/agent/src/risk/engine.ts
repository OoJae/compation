/**
 * Compation risk engine — PURE, deterministic, zero I/O.
 *
 * This is the single source of every number Compation acts on. The LLM decides
 * intent; this module decides size, notional, margin, liquidation price,
 * slippage, and carry — and refuses unsafe plans with typed errors. It needs no
 * chain access, so it is built and exhaustively unit-tested first.
 *
 * Delta-one hedge (go LONG the H100 perp to offset rising compute costs):
 *   Q        = monthlyHours ?? monthlySpend / P
 *   S        = h · Q
 *   Notional = S · P
 *   Margin   = Notional / L
 * With S = h·Q, the long's P&L offsets h (%) of the user's cost change — a clean,
 * defensible delta-one hedge.
 */

import { HOURS_PER_MONTH } from '@compation/shared';
import { roundDownToStep, roundUpToStep } from './math.js';
import { HedgeInputError, PlanError } from './errors.js';
import type {
  AccountState,
  FundingCarryEstimate,
  HedgeIntent,
  HedgePlan,
  MarketParams,
  OrderbookDepth,
  PlanWarning,
  SlippageEstimate,
  ValidationResult,
} from './types.js';

const EPS = 1e-9;

// ---------------------------------------------------------------------------
// Primitive math (each independently testable)
// ---------------------------------------------------------------------------

/** Q — exposure in H100-hour-equivalents, from hours or from spend/price. */
export function deriveExposureHours(intent: HedgeIntent, price: number): number {
  if (intent.monthlyHours != null && intent.monthlyHours > 0) {
    return intent.monthlyHours;
  }
  if (intent.monthlySpendQuote != null && intent.monthlySpendQuote > 0) {
    if (price <= 0) {
      throw new HedgeInputError('price must be > 0 to derive hours from spend');
    }
    return intent.monthlySpendQuote / price;
  }
  throw new HedgeInputError(
    'intent must provide a positive monthlyHours or monthlySpendQuote',
  );
}

/** S = h · Q. */
export function computeHedgeSize(exposureHours: number, hedgeRatio: number): number {
  if (hedgeRatio <= 0 || hedgeRatio > 1) {
    throw new HedgeInputError('hedgeRatio must be in (0, 1]');
  }
  return hedgeRatio * exposureHours;
}

/** Notional = S · P. */
export function computeNotional(size: number, price: number): number {
  return size * price;
}

/** Margin = Notional / L. */
export function computeMargin(notional: number, leverage: number): number {
  if (leverage <= 0) throw new HedgeInputError('leverage must be > 0');
  return notional / leverage;
}

/**
 * Liquidation price for a LONG (the only side we hedge).
 *
 * Margin balance = M + S·(P − E); liquidation when it falls to the maintenance
 * requirement (mmr · S · P). Solving for P with M = S·E/L gives:
 *   P_liq = E · (1 − 1/L) / (1 − mmr)
 */
export function estimateLiquidationPrice(args: {
  entryPrice: number;
  leverage: number;
  side: 'long';
  maintenanceMarginRate: number;
}): number {
  if (args.side !== 'long') {
    throw new HedgeInputError('only long hedges are supported');
  }
  if (args.leverage <= 0) throw new HedgeInputError('leverage must be > 0');
  return (args.entryPrice * (1 - 1 / args.leverage)) / (1 - args.maintenanceMarginRate);
}

/** Distance from entry to liquidation for a long, as a fraction. */
export function liquidationBufferPct(entryPrice: number, liquidationPrice: number): number {
  if (entryPrice <= 0) throw new HedgeInputError('entryPrice must be > 0');
  return (entryPrice - liquidationPrice) / entryPrice;
}

/**
 * Walk the ask side to estimate the average fill for a market buy of
 * `targetQuantity`. If the book is too thin, `fillableQuantity < targetQuantity`.
 */
export function estimateSlippage(
  side: 'buy',
  targetQuantity: number,
  depth: OrderbookDepth,
): SlippageEstimate {
  if (side !== 'buy') throw new HedgeInputError('only buy-side slippage is supported');
  const levels = depth.asks;
  const best = levels.length > 0 ? levels[0]!.price : NaN;

  let remaining = targetQuantity;
  let cost = 0;
  let filled = 0;
  for (const level of levels) {
    if (remaining <= EPS) break;
    const take = Math.min(remaining, level.quantity);
    cost += take * level.price;
    filled += take;
    remaining -= take;
  }

  const avgFillPrice = filled > 0 ? cost / filled : NaN;
  const slippagePct =
    filled > 0 && isFinite(best) && best > 0 ? (avgFillPrice - best) / best : Infinity;
  return { avgFillPrice, slippagePct, fillableQuantity: filled };
}

/** Funding carry of holding the long. Positive hourly rate ⇒ the long pays. */
export function estimateFundingCarry(args: {
  notional: number;
  fundingRateHourly: number;
  horizonMonths: number;
}): FundingCarryEstimate {
  const hourlyCarry = args.notional * args.fundingRateHourly;
  const monthlyCarry = hourlyCarry * HOURS_PER_MONTH;
  const horizonCarry = monthlyCarry * args.horizonMonths;
  return {
    hourlyCarry,
    monthlyCarry,
    horizonCarry,
    payer: args.fundingRateHourly >= 0 ? 'long' : 'short',
  };
}

// ---------------------------------------------------------------------------
// Aggregate: build a plan, then validate it
// ---------------------------------------------------------------------------

/**
 * Compose the primitives into a full plan. Quantizes the size to the market
 * grid, clamps leverage to the market max (warning), and clamps the size up to
 * minNotional (warning). The ONLY place market microstructure touches the math.
 */
export function buildHedgePlan(
  intent: HedgeIntent,
  market: MarketParams,
  depth: OrderbookDepth,
  account: AccountState,
): HedgePlan {
  void account; // account is used by validatePlan, not by sizing
  const warnings: PlanWarning[] = [];

  // 1. Clamp leverage to the market max.
  let leverage = intent.leverage;
  if (leverage > market.maxLeverage) {
    warnings.push({
      code: 'LeverageClamped',
      message: `requested leverage ${leverage}x clamped to market max ${market.maxLeverage}x`,
      detail: { requested: intent.leverage, max: market.maxLeverage },
    });
    leverage = market.maxLeverage;
  }
  if (leverage <= 0) throw new HedgeInputError('leverage must be > 0');

  const entryPrice = market.price;
  if (entryPrice <= 0) throw new HedgeInputError('market price must be > 0');

  // 2. Size: Q → S → quantize down to the size grid.
  const exposureHours = deriveExposureHours(intent, entryPrice);
  const idealSize = computeHedgeSize(exposureHours, intent.hedgeRatio);
  let size = roundDownToStep(idealSize, market.minQuantityTick);

  // 3. minNotional clamp (raise the size to the smallest valid position).
  const floorSize = roundUpToStep(
    market.minNotional / entryPrice,
    market.minQuantityTick,
  );
  if (size <= 0) {
    warnings.push({
      code: 'ClampedToMinNotional',
      message: 'exposure rounds below the market minimum; raised to the smallest valid size',
      detail: { idealSize, raisedTo: floorSize },
    });
    size = floorSize;
  } else if (computeNotional(size, entryPrice) < market.minNotional - EPS) {
    warnings.push({
      code: 'ClampedToMinNotional',
      message: `size raised to satisfy market min notional ${market.minNotional}`,
      detail: { from: size, to: floorSize },
    });
    size = floorSize;
  }

  const notional = computeNotional(size, entryPrice);
  const margin = computeMargin(notional, leverage);

  const estLiquidationPrice = estimateLiquidationPrice({
    entryPrice,
    leverage,
    side: 'long',
    maintenanceMarginRate: market.maintenanceMarginRate,
  });
  const liqBufferPct = liquidationBufferPct(entryPrice, estLiquidationPrice);

  const slip = estimateSlippage('buy', size, depth);
  const carry = estimateFundingCarry({
    notional,
    fundingRateHourly: market.fundingRateHourly,
    horizonMonths: intent.horizonMonths,
  });
  const takerFeeQuote = notional * market.takerFeeRate;

  return {
    exposureHours,
    idealSize,
    size,
    entryPrice,
    notional,
    margin,
    leverage,
    estLiquidationPrice,
    liquidationBufferPct: liqBufferPct,
    maintenanceMarginRate: market.maintenanceMarginRate,
    estAvgFillPrice: slip.avgFillPrice,
    estSlippagePct: slip.slippagePct,
    fillableQuantity: slip.fillableQuantity,
    estHourlyCarry: carry.hourlyCarry,
    estMonthlyCarry: carry.monthlyCarry,
    estHorizonCarry: carry.horizonCarry,
    carryPayer: carry.payer,
    takerFeeQuote,
    hedgeRatio: intent.hedgeRatio,
    horizonMonths: intent.horizonMonths,
    liquidationBufferMin: intent.liquidationBufferMin,
    maxSlippage: intent.maxSlippage,
    warnings,
  };
}

/**
 * Validate a plan against the live market and account. Collects ALL violations
 * (never fail-fast) so the UI/trail can explain every reason a hedge was refused.
 * `plan` is attached only when `ok`.
 */
export function validatePlan(
  plan: HedgePlan,
  market: MarketParams,
  account: AccountState,
): ValidationResult {
  const errors: PlanError[] = [];

  // ExceedsLeverage — invariant guard (buildHedgePlan clamps, so this defends
  // against a hand-built or mutated plan).
  if (plan.leverage > market.maxLeverage + EPS) {
    errors.push(
      new PlanError(
        'ExceedsLeverage',
        `leverage ${plan.leverage}x exceeds market max ${market.maxLeverage}x`,
        { leverage: plan.leverage, max: market.maxLeverage },
      ),
    );
  }

  // InsufficientMargin — margin + taker fee must fit within usable balance.
  const usable = account.availableQuote - account.safetyReserveQuote;
  const required = plan.margin + plan.takerFeeQuote;
  if (required > usable + EPS) {
    errors.push(
      new PlanError(
        'InsufficientMargin',
        `required ${required.toFixed(2)} exceeds usable balance ${usable.toFixed(2)}`,
        {
          required,
          usable,
          available: account.availableQuote,
          reserve: account.safetyReserveQuote,
        },
      ),
    );
  }

  // LiquidationBufferTooClose — keep entry far enough from liquidation.
  if (plan.liquidationBufferPct < plan.liquidationBufferMin - EPS) {
    errors.push(
      new PlanError(
        'LiquidationBufferTooClose',
        `liquidation buffer ${(plan.liquidationBufferPct * 100).toFixed(1)}% is below the required ${(plan.liquidationBufferMin * 100).toFixed(1)}%`,
        { buffer: plan.liquidationBufferPct, min: plan.liquidationBufferMin },
      ),
    );
  }

  // TooThinLiquidity — book can't fill the size, or slippage exceeds tolerance.
  if (plan.fillableQuantity < plan.size - EPS) {
    errors.push(
      new PlanError(
        'TooThinLiquidity',
        `order book can fill only ${plan.fillableQuantity} of ${plan.size}`,
        { fillable: plan.fillableQuantity, target: plan.size },
      ),
    );
  } else if (plan.estSlippagePct > plan.maxSlippage + EPS) {
    errors.push(
      new PlanError(
        'TooThinLiquidity',
        `estimated slippage ${(plan.estSlippagePct * 100).toFixed(2)}% exceeds tolerance ${(plan.maxSlippage * 100).toFixed(2)}%`,
        { slippage: plan.estSlippagePct, max: plan.maxSlippage },
      ),
    );
  }

  const ok = errors.length === 0;
  return {
    ok,
    ...(ok ? { plan } : {}),
    errors,
    warnings: plan.warnings,
  };
}

/** Convenience: build + validate in one call. The orchestrator's `compute_hedge`. */
export function assessHedge(
  intent: HedgeIntent,
  market: MarketParams,
  depth: OrderbookDepth,
  account: AccountState,
): ValidationResult {
  const plan = buildHedgePlan(intent, market, depth, account);
  return validatePlan(plan, market, account);
}
