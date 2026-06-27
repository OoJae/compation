import { describe, it, expect } from 'vitest';
import { getRoute } from '@compation/shared';
import { projectHedge } from './projection.js';
import { deepDepthAt, type InjectiveExecutor } from '../injective/index.js';
import type { OrderbookDepth } from '../risk/index.js';
import type { HedgeIntent, AccountState } from '../risk/index.js';

/** Controllable executor for projection tests (reads only). */
class StubExec implements InjectiveExecutor {
  readonly kind = 'fake' as const;
  constructor(
    private cfg: {
      indexPrice: number;
      venues: Record<string, { price: number; funding?: number; depth: OrderbookDepth }>;
    },
  ) {}
  async getIndexPrice() { return this.cfg.indexPrice; }
  async getVenue(k: string) { const v = this.cfg.venues[k]!; return { price: v.price, fundingRateHourly: v.funding ?? 0 }; }
  async getOrderbookDepth(k: string) { return this.cfg.venues[k]!.depth; }
  async getBankBalance() { return 0; }
  async getPosition() { return null; }
  async openHedge(): Promise<never> { throw new Error('n/a'); }
  async closeHedge(): Promise<never> { throw new Error('n/a'); }
}

const intent = (over: Partial<HedgeIntent> = {}): HedgeIntent => ({
  monthlyHours: 1000,
  hedgeRatio: 0.8,
  horizonMonths: 1,
  leverage: 2,
  liquidationBufferMin: 0.4,
  maxSlippage: 0.01,
  ...over,
});
const account = (availableQuote: number): AccountState => ({ availableQuote, safetyReserveQuote: 0 });
const route = getRoute('headline'); // H100 → NVDA/USDC → [INJ/USDC]

describe('projectHedge', () => {
  it('applies the hedge ratio ONCE: index notional == venue notional', async () => {
    const exec = new StubExec({
      indexPrice: 2.85,
      venues: { 'mainnet:NVDA_USDC': { price: 200, depth: deepDepthAt(200) } },
    });
    const r = await projectHedge(intent(), route, exec, account(100_000));
    expect(r.indexPlan.notional).toBeCloseTo(2280, 6); // 0.8 * 1000 * 2.85
    expect(r.venue.ok).toBe(true);
    expect(r.venueKey).toBe('mainnet:NVDA_USDC');
    expect(r.venue.plan!.size).toBeCloseTo(11.4, 2); // 2280 / 200
    expect(r.venue.plan!.notional).toBeCloseTo(2280, 0); // h NOT re-applied
    expect(r.proxy).toBe(true);
  });

  it('falls back to INJ/USDC ONLY on thin liquidity', async () => {
    const exec = new StubExec({
      indexPrice: 2.85,
      venues: {
        'mainnet:NVDA_USDC': { price: 200, depth: { asks: [{ price: 200, quantity: 1 }] } }, // can't fill 11.4
        'mainnet:INJ_USDC': { price: 4.25, depth: deepDepthAt(4.25) },
      },
    });
    const r = await projectHedge(intent(), route, exec, account(100_000));
    expect(r.venue.ok).toBe(true);
    expect(r.venueKey).toBe('mainnet:INJ_USDC');
    expect(r.attempted).toEqual(['mainnet:NVDA_USDC', 'mainnet:INJ_USDC']);
  });

  it('does NOT fall back on InsufficientMargin (account problem)', async () => {
    const exec = new StubExec({
      indexPrice: 2.85,
      venues: {
        'mainnet:NVDA_USDC': { price: 200, depth: deepDepthAt(200) },
        'mainnet:INJ_USDC': { price: 4.25, depth: deepDepthAt(4.25) },
      },
    });
    const r = await projectHedge(intent(), route, exec, account(10)); // can't cover margin
    expect(r.venue.ok).toBe(false);
    expect(r.attempted).toEqual(['mainnet:NVDA_USDC']); // stopped at primary
    expect(r.venue.errors.map((e) => e.code)).toContain('InsufficientMargin');
  });

  it('surfaces the minNotional clamp for a tiny exposure (pass 1)', async () => {
    const exec = new StubExec({
      indexPrice: 2.85,
      venues: { 'mainnet:NVDA_USDC': { price: 200, depth: deepDepthAt(200) } },
    });
    const r = await projectHedge(intent({ monthlyHours: 0.0001 }), route, exec, account(100_000));
    expect(r.indexPlan.warnings.map((w) => w.code)).toContain('ClampedToMinNotional');
  });
});
