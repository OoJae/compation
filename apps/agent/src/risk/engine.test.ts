import { describe, it, expect } from 'vitest';
import {
  decimalsOf,
  roundDownToStep,
  roundUpToStep,
  roundToStep,
} from './math';
import {
  deriveExposureHours,
  computeHedgeSize,
  computeNotional,
  computeMargin,
  estimateLiquidationPrice,
  liquidationBufferPct,
  estimateSlippage,
  estimateFundingCarry,
  buildHedgePlan,
  validatePlan,
  assessHedge,
} from './engine';
import { HedgeInputError } from './errors';
import type {
  AccountState,
  HedgeIntent,
  HedgePlan,
  MarketParams,
  OrderbookDepth,
} from './types';

// --- fixtures -------------------------------------------------------------

const market = (over: Partial<MarketParams> = {}): MarketParams => ({
  price: 2.5,
  maxLeverage: 5,
  tickSize: 0.001,
  minQuantityTick: 0.01,
  minNotional: 1,
  takerFeeRate: 0.0006,
  fundingRateHourly: 0.00001,
  maintenanceMarginRate: 0.05,
  ...over,
});

const account = (over: Partial<AccountState> = {}): AccountState => ({
  availableQuote: 20000,
  safetyReserveQuote: 100,
  ...over,
});

const intent = (over: Partial<HedgeIntent> = {}): HedgeIntent => ({
  monthlySpendQuote: 40000,
  hedgeRatio: 0.8,
  horizonMonths: 1,
  leverage: 2,
  liquidationBufferMin: 0.4,
  maxSlippage: 0.01,
  ...over,
});

/** A book deep enough to fill any test size at the top price. */
const deepBook: OrderbookDepth = { asks: [{ price: 2.5, quantity: 1_000_000 }] };

const codes = (r: { errors: { code: string }[] }) => r.errors.map((e) => e.code);

// --- quantization ---------------------------------------------------------

describe('math/quantization', () => {
  it('decimalsOf reads the scale of a step', () => {
    expect(decimalsOf(1)).toBe(0);
    expect(decimalsOf(0.5)).toBe(1);
    expect(decimalsOf(0.01)).toBe(2);
    expect(decimalsOf(0.001)).toBe(3);
    expect(decimalsOf(0.0001)).toBe(4);
  });

  it('rounds down to the size grid and survives float artifacts', () => {
    expect(roundDownToStep(0.327, 0.01)).toBeCloseTo(0.32, 10);
    expect(roundDownToStep(0.0032, 0.01)).toBe(0);
    // 3 / 0.001 = 2999.9999… in binary float — must not floor to 2.999
    expect(roundDownToStep(3, 0.001)).toBeCloseTo(3, 10);
    expect(roundDownToStep(12800, 0.01)).toBeCloseTo(12800, 6);
  });

  it('rounds up to reach a floor', () => {
    expect(roundUpToStep(0.4, 0.01)).toBeCloseTo(0.4, 10);
    expect(roundUpToStep(0.401, 0.01)).toBeCloseTo(0.41, 10);
    expect(roundUpToStep(0.327, 0.01)).toBeCloseTo(0.33, 10);
  });

  it('rounds a price to its nearest tick', () => {
    expect(roundToStep(2.5034, 0.001)).toBeCloseTo(2.503, 10);
    expect(roundToStep(2.5036, 0.001)).toBeCloseTo(2.504, 10);
  });
});

// --- primitives -----------------------------------------------------------

describe('deriveExposureHours', () => {
  it('uses hours directly when given', () => {
    expect(deriveExposureHours(intent({ monthlyHours: 100 }), 2.5)).toBe(100);
  });
  it('prefers explicit hours over spend', () => {
    expect(
      deriveExposureHours(intent({ monthlyHours: 100, monthlySpendQuote: 40000 }), 2.5),
    ).toBe(100);
  });
  it('derives hours from spend / price', () => {
    expect(deriveExposureHours(intent({ monthlySpendQuote: 40000 }), 2.5)).toBe(16000);
  });
  it('throws when neither hours nor spend provided', () => {
    expect(() =>
      deriveExposureHours(
        intent({ monthlyHours: undefined, monthlySpendQuote: undefined }),
        2.5,
      ),
    ).toThrow(HedgeInputError);
  });
  it('throws when deriving from spend with non-positive price', () => {
    expect(() => deriveExposureHours(intent({ monthlySpendQuote: 40000 }), 0)).toThrow(
      HedgeInputError,
    );
  });
});

describe('size / notional / margin', () => {
  it('S = h · Q', () => {
    expect(computeHedgeSize(16000, 0.8)).toBe(12800);
  });
  it('rejects hedge ratios outside (0,1]', () => {
    expect(() => computeHedgeSize(16000, 0)).toThrow(HedgeInputError);
    expect(() => computeHedgeSize(16000, 1.5)).toThrow(HedgeInputError);
  });
  it('Notional = S · P and Margin = Notional / L', () => {
    expect(computeNotional(12800, 2.5)).toBe(32000);
    expect(computeMargin(32000, 2)).toBe(16000);
  });
  it('rejects non-positive leverage', () => {
    expect(() => computeMargin(32000, 0)).toThrow(HedgeInputError);
  });
});

describe('liquidation', () => {
  it('computes the long liquidation price P_liq = E(1-1/L)/(1-mmr)', () => {
    const liq = estimateLiquidationPrice({
      entryPrice: 2.5,
      leverage: 2,
      side: 'long',
      maintenanceMarginRate: 0.05,
    });
    expect(liq).toBeCloseTo((2.5 * 0.5) / 0.95, 8); // 1.31578…
  });
  it('buffer shrinks as leverage rises (≈47% at 2x, ≈16% at 5x)', () => {
    const buf = (L: number) =>
      liquidationBufferPct(
        2.5,
        estimateLiquidationPrice({
          entryPrice: 2.5,
          leverage: L,
          side: 'long',
          maintenanceMarginRate: 0.05,
        }),
      );
    expect(buf(2)).toBeCloseTo(0.4737, 3);
    expect(buf(5)).toBeCloseTo(0.1579, 3);
    expect(buf(2)).toBeGreaterThan(buf(5));
  });
  it('only supports long hedges', () => {
    expect(() =>
      estimateLiquidationPrice({
        entryPrice: 2.5,
        leverage: 2,
        // @ts-expect-error testing the runtime guard
        side: 'short',
        maintenanceMarginRate: 0.05,
      }),
    ).toThrow(HedgeInputError);
  });
});

describe('estimateSlippage', () => {
  it('fills fully at the top of a deep book with zero slippage', () => {
    const s = estimateSlippage('buy', 12800, deepBook);
    expect(s.fillableQuantity).toBeCloseTo(12800, 6);
    expect(s.avgFillPrice).toBeCloseTo(2.5, 10);
    expect(s.slippagePct).toBeCloseTo(0, 10);
  });
  it('walks multiple levels and reports VWAP slippage', () => {
    const book: OrderbookDepth = {
      asks: [
        { price: 2.5, quantity: 1000 },
        { price: 2.6, quantity: 1000 },
        { price: 2.7, quantity: 1000 },
      ],
    };
    const s = estimateSlippage('buy', 2000, book);
    expect(s.fillableQuantity).toBe(2000);
    expect(s.avgFillPrice).toBeCloseTo(2.55, 10); // (1000*2.5 + 1000*2.6)/2000
    expect(s.slippagePct).toBeCloseTo((2.55 - 2.5) / 2.5, 10);
  });
  it('reports a shortfall when the book is too thin', () => {
    const thin: OrderbookDepth = { asks: [{ price: 2.5, quantity: 100 }] };
    const s = estimateSlippage('buy', 12800, thin);
    expect(s.fillableQuantity).toBe(100);
    expect(s.fillableQuantity).toBeLessThan(12800);
  });
});

describe('estimateFundingCarry', () => {
  it('long pays when the hourly rate is positive; monthly = hourly · 730', () => {
    const c = estimateFundingCarry({
      notional: 32000,
      fundingRateHourly: 0.00001,
      horizonMonths: 1,
    });
    expect(c.payer).toBe('long');
    expect(c.hourlyCarry).toBeCloseTo(0.32, 10);
    expect(c.monthlyCarry).toBeCloseTo(0.32 * 730, 8);
    expect(c.horizonCarry).toBeCloseTo(c.monthlyCarry, 8);
  });
  it('short pays when the hourly rate is negative', () => {
    const c = estimateFundingCarry({
      notional: 32000,
      fundingRateHourly: -0.00002,
      horizonMonths: 3,
    });
    expect(c.payer).toBe('short');
    expect(c.horizonCarry).toBeCloseTo(c.monthlyCarry * 3, 8);
  });
});

// --- buildHedgePlan -------------------------------------------------------

describe('buildHedgePlan', () => {
  it('produces the golden $40k/month plan', () => {
    const p = buildHedgePlan(intent(), market(), deepBook, account());
    expect(p.exposureHours).toBe(16000);
    expect(p.idealSize).toBe(12800);
    expect(p.size).toBeCloseTo(12800, 6);
    expect(p.notional).toBeCloseTo(32000, 6);
    expect(p.margin).toBeCloseTo(16000, 6);
    expect(p.leverage).toBe(2);
    expect(p.liquidationBufferPct).toBeGreaterThan(0.4);
    expect(p.takerFeeQuote).toBeCloseTo(19.2, 6);
    expect(p.warnings).toHaveLength(0);
  });

  it('clamps leverage above the market max with a warning', () => {
    const p = buildHedgePlan(intent({ leverage: 10 }), market(), deepBook, account());
    expect(p.leverage).toBe(5);
    expect(p.warnings.map((w) => w.code)).toContain('LeverageClamped');
  });

  it('throws an oracle-flavoured error when the market price is NaN (stale read)', () => {
    expect(() => buildHedgePlan(intent(), market({ price: NaN }), deepBook, account())).toThrow(/oracle/i);
  });

  it('raises a sub-minNotional size up to the floor with a warning', () => {
    // tiny spend → tiny size, below minNotional
    const p = buildHedgePlan(
      intent({ monthlySpendQuote: 1 }),
      market(),
      deepBook,
      account(),
    );
    expect(p.notional).toBeGreaterThanOrEqual(1 - 1e-9);
    expect(p.warnings.map((w) => w.code)).toContain('ClampedToMinNotional');
  });

  it('raises an exposure that rounds to zero up to the minimum size', () => {
    const p = buildHedgePlan(
      intent({ monthlySpendQuote: 0.01 }), // S ≈ 0.0032 → rounds to 0
      market(),
      deepBook,
      account(),
    );
    expect(p.size).toBeGreaterThan(0);
    expect(p.notional).toBeGreaterThanOrEqual(1 - 1e-9);
    expect(p.warnings.map((w) => w.code)).toContain('ClampedToMinNotional');
  });
});

// --- validatePlan ---------------------------------------------------------

describe('validatePlan', () => {
  it('accepts the golden plan and attaches it', () => {
    const r = assessHedge(intent(), market(), deepBook, account());
    expect(r.ok).toBe(true);
    expect(r.errors).toHaveLength(0);
    expect(r.plan).toBeDefined();
  });

  it('flags InsufficientMargin on a zero balance', () => {
    const r = assessHedge(
      intent(),
      market(),
      deepBook,
      account({ availableQuote: 0, safetyReserveQuote: 0 }),
    );
    expect(r.ok).toBe(false);
    expect(codes(r)).toContain('InsufficientMargin');
    expect(r.plan).toBeUndefined();
  });

  it('flags LiquidationBufferTooClose when leverage is forced high, and suggests a max leverage', () => {
    // 5x ⇒ ~16% buffer < 40% required; deep book + big balance isolate the buffer
    const r = assessHedge(
      intent({ leverage: 5 }),
      market(),
      deepBook,
      account({ availableQuote: 100000 }),
    );
    expect(r.ok).toBe(false);
    expect(codes(r)).toContain('LiquidationBufferTooClose');
    const e = r.errors.find((x) => x.code === 'LiquidationBufferTooClose');
    expect(e?.message).toMatch(/reduce leverage/i);
  });

  it('flags TooThinLiquidity when the book cannot fill the size', () => {
    const thin: OrderbookDepth = { asks: [{ price: 2.5, quantity: 100 }] };
    const r = assessHedge(
      intent(),
      market(),
      thin,
      account({ availableQuote: 100000 }),
    );
    expect(r.ok).toBe(false);
    expect(codes(r)).toContain('TooThinLiquidity');
  });

  it('flags TooThinLiquidity when slippage exceeds tolerance (book deep but steep)', () => {
    const steep: OrderbookDepth = {
      asks: Array.from({ length: 10 }, (_, i) => ({
        price: 2.5 + i * 0.05,
        quantity: 2000,
      })),
    };
    const r = assessHedge(
      intent({ maxSlippage: 0.005 }),
      market(),
      steep,
      account({ availableQuote: 100000 }),
    );
    expect(r.ok).toBe(false);
    expect(codes(r)).toContain('TooThinLiquidity');
  });

  it('collects ALL violations at once (margin + buffer + liquidity)', () => {
    const thin: OrderbookDepth = { asks: [{ price: 2.5, quantity: 100 }] };
    const r = assessHedge(
      intent({ leverage: 5 }),
      market(),
      thin,
      account({ availableQuote: 0, safetyReserveQuote: 0 }),
    );
    expect(r.ok).toBe(false);
    expect(codes(r)).toEqual(
      expect.arrayContaining([
        'InsufficientMargin',
        'LiquidationBufferTooClose',
        'TooThinLiquidity',
      ]),
    );
  });

  it('defensively flags ExceedsLeverage on a hand-mutated plan', () => {
    const base = buildHedgePlan(intent(), market(), deepBook, account());
    const tampered: HedgePlan = { ...base, leverage: 9 };
    const r = validatePlan(tampered, market(), account({ availableQuote: 100000 }));
    expect(codes(r)).toContain('ExceedsLeverage');
  });

  it('clamps leverage but still validates when the buffer is permissive', () => {
    const r = assessHedge(
      intent({ leverage: 10, liquidationBufferMin: 0.1 }),
      market(),
      deepBook,
      account({ availableQuote: 100000 }),
    );
    expect(r.ok).toBe(true);
    expect(r.plan?.leverage).toBe(5);
    expect(r.warnings.map((w) => w.code)).toContain('LeverageClamped');
  });
});
