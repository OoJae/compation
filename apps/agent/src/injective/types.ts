/**
 * Execution-layer types. The executor is the ONLY place chain I/O and key
 * signing happen; everything above it works in human decimals.
 */
import type { OrderbookDepth } from '../risk/index';

/** Injective derivative order type: 1 = BUY (long), 2 = SELL (short/close-long). */
export type OrderTypeCode = 1 | 2;

/** A fully scaled + quantized order ready to submit (the only numbers that reach the chain). */
export interface QuantizedOrder {
  orderType: OrderTypeCode;
  /** Chain-scaled, quantized strings passed straight to MsgCreateDerivativeMarketOrder. */
  chainPrice: string;
  chainQuantity: string;
  chainMargin: string;
  /** Human values (for the trail / display / margin checks). */
  humanPrice: number; // slippage-padded submission price
  humanQuantity: number; // quantized size actually submitted
  humanMargin: number;
}

export interface VenueQuote {
  /** Mark/oracle price in human quote units. */
  price: number;
  /** Hourly funding rate as a fraction; positive ⇒ longs pay. */
  fundingRateHourly: number;
}

export interface OnChainPosition {
  marketId: string;
  subaccountId: string;
  direction: 'long' | 'short';
  quantity: number; // human contracts
  entryPrice: number; // human
  margin: number; // human quote
  liquidationPrice: number; // human — authoritative, from the chain
  markPrice: number; // human
  unrealizedPnl: number; // human quote
}

export interface OpenResult {
  txHash: string;
  explorerUrl: string;
  venueKey: string;
  order: QuantizedOrder;
}

export interface CloseResult {
  txHash: string;
  explorerUrl: string;
  venueKey: string;
}

export class NotImplemented extends Error {
  constructor(what: string) {
    super(`${what} not implemented`);
    this.name = 'NotImplemented';
  }
}

/** Thrown by SdkExecutor when a mainnet write is attempted without the explicit gate. */
export class MainnetWriteBlocked extends Error {
  constructor(venueKey: string) {
    super(`Mainnet write to ${venueKey} blocked. Set ALLOW_MAINNET_WRITES=true to permit.`);
    this.name = 'MainnetWriteBlocked';
  }
}

/**
 * One execution backend. Reads return human decimals in the risk-engine shape;
 * writes take a fully-quantized order and return a real tx hash. Implementations:
 * SdkExecutor (default), FakeExecutor (zero-chain dev), McpExecutor (stub).
 */
export interface InjectiveExecutor {
  readonly kind: 'sdk' | 'fake' | 'mcp';
  /** Live index price (e.g. the H100 Stork oracle), human quote units. */
  getIndexPrice(indexMarketKey: string): Promise<number>;
  /** Venue mark price + funding. */
  getVenue(venueKey: string): Promise<VenueQuote>;
  /** Ask-side depth for a long, mapped to the risk-engine shape (human price/qty). */
  getOrderbookDepth(venueKey: string): Promise<OrderbookDepth>;
  /** Available bank balance in the venue's quote denom (USDC), human units. */
  getBankBalance(venueKey: string): Promise<number>;
  /** Current open position on the venue, or null. */
  getPosition(venueKey: string): Promise<OnChainPosition | null>;
  /** Open a long hedge with a pre-quantized order. */
  openHedge(venueKey: string, order: QuantizedOrder): Promise<OpenResult>;
  /** Close the full open position on the venue. */
  closeHedge(venueKey: string): Promise<CloseResult>;
}
