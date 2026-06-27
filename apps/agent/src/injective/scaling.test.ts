import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';
import {
  quantizeDown,
  humanPriceToChain,
  humanQtyToChain,
  humanMarginToChain,
  chainPriceToHuman,
  buildQuantizedOrder,
} from './scaling.js';

describe('quantizeDown', () => {
  it('rounds down to the tick', () => {
    expect(quantizeDown(new Decimal('5.2349'), new Decimal('0.001')).toFixed()).toBe('5.234');
    expect(quantizeDown(new Decimal('114.117'), new Decimal('0.01')).toFixed()).toBe('114.11');
    expect(quantizeDown(new Decimal('0.0005'), new Decimal('0.001')).toFixed()).toBe('0');
  });
});

describe('humanPriceToChain (×10^dec, quantized down to chain tick)', () => {
  it('NVDA tick 0.01, dec 6', () => {
    expect(humanPriceToChain(196.557, 6, 0.01)).toBe('196550000'); // $196.55
    expect(humanPriceToChain(200, 6, 0.01)).toBe('200000000');
  });
  it('INJ tick 0.001, dec 6', () => {
    expect(humanPriceToChain(4.2569, 6, 0.001)).toBe('4256000'); // $4.256
  });
  it('H100 tick 0.001, dec 6', () => {
    expect(humanPriceToChain(2.85, 6, 0.001)).toBe('2850000');
  });
});

describe('humanQtyToChain (stays human, quantized down)', () => {
  it('NVDA qty tick 0.001', () => {
    expect(humanQtyToChain(5.2349, 0.001)).toBe('5.234');
  });
  it('INJ qty tick 0.01', () => {
    expect(humanQtyToChain(114.117, 0.01)).toBe('114.11');
  });
  it('rounds tiny size to 0', () => {
    expect(humanQtyToChain(0.0005, 0.001)).toBe('0');
  });
});

describe('humanMarginToChain (×10^dec, ROUND UP)', () => {
  it('scales and rounds up', () => {
    expect(humanMarginToChain(500, 6)).toBe('500000000');
    expect(humanMarginToChain(12.3456785, 6)).toBe('12345679'); // .5 rounds up
  });
});

describe('chainPriceToHuman', () => {
  it('divides by 10^dec', () => {
    expect(chainPriceToHuman('196550000', 6)).toBeCloseTo(196.55, 6);
  });
});

describe('buildQuantizedOrder', () => {
  const nvda = { quoteDecimals: 6, tickSize: 0.01, minQuantityTick: 0.001 };

  it('builds a clean long order (no slippage)', () => {
    const o = buildQuantizedOrder({ ...nvda, execPrice: 200, quantity: 5, leverage: 2, maxSlippage: 0 });
    expect(o.orderType).toBe(1);
    expect(o.chainPrice).toBe('200000000');
    expect(o.chainQuantity).toBe('5');
    expect(o.chainMargin).toBe('500000000'); // 200*5/2 = 500
    expect(o.humanMargin).toBeCloseTo(500, 6);
  });

  it('pads the price up by slippage and derives margin from the padded price', () => {
    const o = buildQuantizedOrder({ ...nvda, execPrice: 200, quantity: 5, leverage: 2, maxSlippage: 0.005 });
    expect(o.chainPrice).toBe('201000000'); // 200 * 1.005
    expect(o.humanMargin).toBeCloseTo(502.5, 6); // 201*5/2
  });

  it('GUARANTEES margin >= price*qty/leverage (the chain constraint)', () => {
    const o = buildQuantizedOrder({ ...nvda, execPrice: 195.58, quantity: 5.234, leverage: 3, maxSlippage: 0.005 });
    const price = new Decimal(o.chainPrice).div(new Decimal(10).pow(6)); // submitted human price
    const required = price.mul(o.humanQuantity).div(3);
    expect(o.humanMargin).toBeGreaterThanOrEqual(required.toNumber() - 1e-9);
  });

  it('throws when the size quantizes to zero', () => {
    expect(() => buildQuantizedOrder({ ...nvda, execPrice: 200, quantity: 0.0005, leverage: 2, maxSlippage: 0 })).toThrow(/rounds to 0/);
  });
});
