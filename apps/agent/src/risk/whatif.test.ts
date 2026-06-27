import { describe, it, expect } from 'vitest';
import { simulateRateMove } from './whatif';

describe('simulateRateMove', () => {
  it('+20% on a $40k bill, 80% hedged: hedge offsets most of the increase', () => {
    const r = simulateRateMove({ monthlyBill: 40_000, hedgeRatio: 0.8, ratePctChange: 0.2 });
    expect(r.billDelta).toBeCloseTo(8000, 6);
    expect(r.hedgePnl).toBeCloseTo(6400, 6);
    expect(r.netImpact).toBeCloseTo(1600, 6);
    expect(r.newBill).toBeCloseTo(48_000, 6);
    expect(r.effectiveBill).toBeCloseTo(41_600, 6); // 48000 - 6400
  });

  it('is symmetric on a rate DROP (the hedge gives back some savings)', () => {
    const r = simulateRateMove({ monthlyBill: 40_000, hedgeRatio: 0.8, ratePctChange: -0.2 });
    expect(r.billDelta).toBeCloseTo(-8000, 6);
    expect(r.hedgePnl).toBeCloseTo(-6400, 6); // long hedge loses when rate falls
    expect(r.netImpact).toBeCloseTo(-1600, 6);
    expect(r.effectiveBill).toBeCloseTo(38_400, 6); // 32000 - (-6400)
  });

  it('full hedge (h=1) → zero net impact', () => {
    const r = simulateRateMove({ monthlyBill: 40_000, hedgeRatio: 1, ratePctChange: 0.3 });
    expect(r.netImpact).toBeCloseTo(0, 6);
    expect(r.effectiveBill).toBeCloseTo(40_000, 6);
  });

  it('no hedge (h=0) → full exposure, no offset', () => {
    const r = simulateRateMove({ monthlyBill: 40_000, hedgeRatio: 0, ratePctChange: 0.25 });
    expect(r.hedgePnl).toBe(0);
    expect(r.netImpact).toBeCloseTo(10_000, 6);
    expect(r.effectiveBill).toBeCloseTo(50_000, 6);
  });

  it('flat rate → no change', () => {
    const r = simulateRateMove({ monthlyBill: 40_000, hedgeRatio: 0.8, ratePctChange: 0 });
    expect(r.billDelta).toBe(0);
    expect(r.hedgePnl).toBe(0);
    expect(r.effectiveBill).toBeCloseTo(40_000, 6);
  });
});
