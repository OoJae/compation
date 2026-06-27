/**
 * MCP-server execution path (flag-gated, deferred). Stub for Phase 1 — the
 * default/demoed path is SdkExecutor. Filled in a later increment.
 */
import type { OrderbookDepth } from '../risk/index';
import {
  NotImplemented,
  type InjectiveExecutor,
  type VenueQuote,
  type OnChainPosition,
  type OpenResult,
  type CloseResult,
  type QuantizedOrder,
} from './types';

export class McpExecutor implements InjectiveExecutor {
  readonly kind = 'mcp' as const;
  getIndexPrice(): Promise<number> { throw new NotImplemented('McpExecutor.getIndexPrice'); }
  getVenue(): Promise<VenueQuote> { throw new NotImplemented('McpExecutor.getVenue'); }
  getOrderbookDepth(): Promise<OrderbookDepth> { throw new NotImplemented('McpExecutor.getOrderbookDepth'); }
  getBankBalance(): Promise<number> { throw new NotImplemented('McpExecutor.getBankBalance'); }
  getPosition(): Promise<OnChainPosition | null> { throw new NotImplemented('McpExecutor.getPosition'); }
  openHedge(_v: string, _o: QuantizedOrder): Promise<OpenResult> { throw new NotImplemented('McpExecutor.openHedge'); }
  closeHedge(): Promise<CloseResult> { throw new NotImplemented('McpExecutor.closeHedge'); }
}
