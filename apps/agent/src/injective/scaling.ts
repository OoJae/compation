/**
 * Human ↔ chain scaling for Injective derivatives — the riskiest math, so it
 * lives in one place and uses Decimal.js exclusively (native floats corrupt
 * `humanPrice × 10^6`). Mirrors the proven helpers in the Injective MCP server
 * (infra/mcp/server/src/trading/math.ts).
 *
 * Conventions (verified):
 *  - derivative order PRICE is chain-scaled: humanPrice × 10^quoteDecimals,
 *    quantized DOWN to the chain tick (= humanTickSize × 10^quoteDecimals).
 *  - derivative order QUANTITY stays HUMAN, quantized DOWN to minQuantityTick.
 *  - derivative order MARGIN is chain-scaled: humanMargin × 10^quoteDecimals,
 *    rounded UP (the chain rejects when price × qty / leverage > margin).
 */
import Decimal from 'decimal.js';
import type { OrderTypeCode, QuantizedOrder } from './types.js';

/** Quantize a value DOWN to the nearest multiple of `tick` (float-artifact safe). */
export function quantizeDown(value: Decimal, tick: Decimal): Decimal {
  if (tick.lte(0)) return value;
  const tickDecimals = Math.max(0, -tick.e);
  return value.div(tick).floor().mul(tick).toDecimalPlaces(tickDecimals, Decimal.ROUND_DOWN);
}

const pow10 = (n: number) => new Decimal(10).pow(n);

/** humanPrice → chain integer string, quantized down to the chain tick. */
export function humanPriceToChain(humanPrice: number, quoteDecimals: number, humanTickSize: number): string {
  const scale = pow10(quoteDecimals);
  const chainTick = new Decimal(humanTickSize).mul(scale);
  return quantizeDown(new Decimal(humanPrice).mul(scale), chainTick).toFixed(0, Decimal.ROUND_DOWN);
}

/** humanQty → quantized HUMAN decimal string (NOT scaled by decimals). */
export function humanQtyToChain(humanQty: number, minQuantityTick: number): string {
  return quantizeDown(new Decimal(humanQty), new Decimal(minQuantityTick)).toFixed();
}

/** humanMargin → chain integer string, rounded UP. */
export function humanMarginToChain(humanMargin: number, quoteDecimals: number): string {
  return new Decimal(humanMargin).mul(pow10(quoteDecimals)).toFixed(0, Decimal.ROUND_UP);
}

/** chain price integer string → human number. */
export function chainPriceToHuman(chainPrice: string, quoteDecimals: number): number {
  return new Decimal(chainPrice).div(pow10(quoteDecimals)).toNumber();
}

export interface BuildOrderArgs {
  quoteDecimals: number;
  tickSize: number; // human price tick
  minQuantityTick: number; // human size tick
  /** Execution reference price (worst-fill walked, or oracle), human. */
  execPrice: number;
  /** Desired size (human contracts), pre-quantization. */
  quantity: number;
  leverage: number;
  /** Slippage tolerance as a fraction (e.g. 0.005). */
  maxSlippage: number;
  side?: 'long';
}

/**
 * Build the submit-ready order for a LONG market open. Pads the price up by
 * `maxSlippage`, quantizes price down + quantity down, and derives margin from
 * the PADDED price (rounded up) so the chain's `price×qty/lev ≤ margin` holds.
 */
export function buildQuantizedOrder(args: BuildOrderArgs): QuantizedOrder {
  const { quoteDecimals, tickSize, minQuantityTick, leverage, maxSlippage } = args;
  if ((args.side ?? 'long') !== 'long') throw new Error('only long hedges supported');

  const exec = new Decimal(args.execPrice);
  const paddedPrice = exec.mul(new Decimal(1).plus(maxSlippage)); // long → pad up
  const qty = quantizeDown(new Decimal(args.quantity), new Decimal(minQuantityTick));
  if (qty.lte(0)) {
    throw new Error(`quantized quantity rounds to 0 (size ${args.quantity}, tick ${minQuantityTick})`);
  }

  const marginHuman = paddedPrice.mul(qty).div(new Decimal(leverage));
  const orderType: OrderTypeCode = 1;

  return {
    orderType,
    chainPrice: humanPriceToChain(paddedPrice.toNumber(), quoteDecimals, tickSize),
    chainQuantity: qty.toFixed(),
    chainMargin: humanMarginToChain(marginHuman.toNumber(), quoteDecimals),
    humanPrice: paddedPrice.toNumber(),
    humanQuantity: qty.toNumber(),
    humanMargin: marginHuman.toNumber(),
  };
}
