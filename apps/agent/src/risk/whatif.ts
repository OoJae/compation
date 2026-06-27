/**
 * What-if: model how a move in the H100 rental rate hits the founder's compute
 * bill versus the hedge. Pure delta-one math (the same identity the hedge is
 * built on): a long hedge sized at ratio h gains h% of the bill's increase.
 */
export interface RateMoveInput {
  /** The monthly compute bill at the hedge-time index (Q × P0). */
  monthlyBill: number;
  /** Hedge ratio h in [0, 1]. */
  hedgeRatio: number;
  /** Rate move as a fraction (e.g. 0.2 = +20%, -0.1 = -10%). */
  ratePctChange: number;
}

export interface RateMoveResult {
  /** Compute bill after the move: monthlyBill × (1 + Δ). */
  newBill: number;
  /** Change in the bill: monthlyBill × Δ (positive = costs more). */
  billDelta: number;
  /** Hedge P&L: h × billDelta (a long hedge profits when the rate rises). */
  hedgePnl: number;
  /** What the move actually costs after the hedge: (1 − h) × billDelta. */
  netImpact: number;
  /** Effective bill after applying the hedge P&L: newBill − hedgePnl. */
  effectiveBill: number;
}

export function simulateRateMove(input: RateMoveInput): RateMoveResult {
  const { monthlyBill, hedgeRatio, ratePctChange } = input;
  const billDelta = monthlyBill * ratePctChange;
  const hedgePnl = hedgeRatio * billDelta;
  const netImpact = billDelta - hedgePnl;
  const newBill = monthlyBill * (1 + ratePctChange);
  const effectiveBill = newBill - hedgePnl;
  return { newBill, billDelta, hedgePnl, netImpact, effectiveBill };
}
