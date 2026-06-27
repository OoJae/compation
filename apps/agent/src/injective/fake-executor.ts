/**
 * Zero-chain executor for repeatable dev + the <20s rehearsal loop. Canned
 * prices/depth/balance, an in-memory position, and deterministic fake tx
 * hashes. No network, no keys.
 */
import { getMarketProfile, explorerTxUrl } from '@compation/shared';
import type { OrderbookDepth } from '../risk/index.js';
import { deepDepthAt } from './adapters.js';
import type {
  InjectiveExecutor,
  VenueQuote,
  OnChainPosition,
  OpenResult,
  CloseResult,
  QuantizedOrder,
} from './types.js';

const CANNED_PRICES: Record<string, number> = {
  H100: 2.85,
  NVDA: 195.58,
  INJ: 4.25,
  BTC: 60_000,
};

export class FakeExecutor implements InjectiveExecutor {
  readonly kind = 'fake' as const;
  private positions = new Map<string, OnChainPosition>();
  private nonce = 0;
  private bank: number;

  constructor(opts: { bankBalance?: number } = {}) {
    // Large by default so the rehearsal loop can show a full $40k-scale hedge.
    this.bank = opts.bankBalance ?? 100_000;
  }

  private priceOf(key: string): number {
    return CANNED_PRICES[getMarketProfile(key).marketSymbol] ?? 100;
  }

  async getIndexPrice(indexKey: string): Promise<number> {
    return this.priceOf(indexKey);
  }

  async getVenue(venueKey: string): Promise<VenueQuote> {
    return { price: this.priceOf(venueKey), fundingRateHourly: 0.00001 };
  }

  async getOrderbookDepth(venueKey: string): Promise<OrderbookDepth> {
    return deepDepthAt(this.priceOf(venueKey));
  }

  async getBankBalance(_venueKey: string): Promise<number> {
    return this.bank;
  }

  async getPosition(venueKey: string): Promise<OnChainPosition | null> {
    return this.positions.get(venueKey) ?? null;
  }

  async openHedge(venueKey: string, order: QuantizedOrder): Promise<OpenResult> {
    const profile = getMarketProfile(venueKey);
    const txHash = this.fakeHash('A');
    this.positions.set(venueKey, {
      marketId: profile.marketId || `fake-${venueKey}`,
      subaccountId: 'fake-subaccount',
      direction: 'long',
      quantity: order.humanQuantity,
      entryPrice: order.humanPrice,
      margin: order.humanMargin,
      liquidationPrice: order.humanPrice * 0.5,
      markPrice: order.humanPrice,
      unrealizedPnl: 0,
    });
    return { txHash, explorerUrl: explorerTxUrl(profile.network, txHash), venueKey, order };
  }

  async closeHedge(venueKey: string): Promise<CloseResult> {
    const profile = getMarketProfile(venueKey);
    this.positions.delete(venueKey);
    const txHash = this.fakeHash('B');
    return { txHash, explorerUrl: explorerTxUrl(profile.network, txHash), venueKey };
  }

  private fakeHash(tag: string): string {
    this.nonce += 1;
    return (`FACE${tag}${this.nonce}`.padEnd(64, '0')).slice(0, 64).toUpperCase();
  }
}
