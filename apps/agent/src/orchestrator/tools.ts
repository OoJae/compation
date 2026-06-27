/**
 * The 4 orchestrator tools. The model expresses INTENT and references plans by
 * id; it can NEVER pass a size/notional/margin/quantity — there is no such
 * field on any schema. Every number comes from the risk engine via these tools.
 */
import { tool, type ToolSet } from 'ai';
import { z } from 'zod';
import { getMarketProfile, type HedgeRoute } from '@compation/shared';
import type { HedgeIntent } from '../risk/index';
import {
  buildQuantizedOrder,
  worstFillPrice,
  toAccountState,
  normalizeExecutionError,
  isUncertainExecutionError,
  type InjectiveExecutor,
} from '../injective/index';
import { projectHedge, type ProjectionResult } from './projection';
import { PlanStore } from './plan-store';
import type { Trail } from './trail';

// --- schemas (exported for the structural size-proof test) ---
export const assessExposureSchema = z.object({
  monthlySpendQuote: z.number().positive().optional().describe('USD spent on H100 GPUs per month'),
  monthlyHours: z.number().positive().optional().describe('H100-hours per month, if the user states it directly'),
  hedgeRatio: z.number().gt(0).lte(1).default(0.8).describe('fraction of the exposure to hedge'),
  leverage: z.number().positive().max(5).default(2),
  horizonMonths: z.number().positive().default(1),
  // Policy floors/ceilings — bounded here AND re-clamped server-side in assess_exposure
  // so a crafted prompt can't talk the agent into a thin-book / near-liquidation entry.
  liquidationBufferMin: z.number().min(0.2).max(1).default(0.4),
  maxSlippage: z.number().min(0).max(0.02).default(0.005),
});
export const computeHedgeSchema = z.object({});
export const placeHedgeSchema = z.object({ planId: z.string() });
export const summarizeSchema = z.object({});

export interface TurnContext {
  route: HedgeRoute;
  intent?: HedgeIntent;
  result?: {
    txHash: string;
    explorerUrl: string;
    venueKey: string;
    side: 'long';
    size: number;
    notional: number;
    margin: number;
  };
}

const reserveFor = (balance: number) => Math.max(0.5, balance * 0.02);

function summarizeProjection(planId: string, p: ProjectionResult, bankUsdc: number) {
  const ip = p.indexPlan;
  const v = p.venue;
  const venueProfile = getMarketProfile(p.venueKey);
  return {
    planId,
    ok: v.ok,
    proxy: p.proxy,
    venueKey: p.venueKey,
    venueTicker: venueProfile.marketTicker,
    attempted: p.attempted,
    h100: {
      indexPrice: ip.entryPrice,
      exposureHours: ip.exposureHours,
      hedgeSize: ip.size,
      notional: ip.notional,
      hedgeRatio: ip.hedgeRatio,
      monthlyCarry: ip.estMonthlyCarry,
    },
    execution: v.plan
      ? {
          venuePrice: v.plan.entryPrice,
          size: v.plan.size,
          notional: v.plan.notional,
          margin: v.plan.margin,
          leverage: v.plan.leverage,
          estLiquidationPrice: v.plan.estLiquidationPrice,
          liquidationBufferPct: v.plan.liquidationBufferPct,
          estSlippagePct: v.plan.estSlippagePct,
          estMonthlyCarry: v.plan.estMonthlyCarry,
        }
      : null,
    bankUsdc,
    errors: v.errors.map((e) => ({ code: e.code, message: e.message })),
    warnings: v.warnings.map((w) => ({ code: w.code, message: w.message })),
  };
}

export interface OpenedPosition {
  venueKey: string;
  side: 'long';
  size: number;
  notional: number;
  margin: number;
  txHash: string;
  explorerUrl: string;
}

export function makeTools(deps: {
  executor: InjectiveExecutor;
  trail: Trail;
  planStore: PlanStore;
  ctx: TurnContext;
  onPosition?: (p: OpenedPosition) => void;
}): ToolSet {
  const { executor, trail, planStore, ctx } = deps;

  const assess_exposure = tool({
    description: "Extract the user's H100 compute exposure and hedge preferences as INTENT only. Never compute sizes.",
    inputSchema: assessExposureSchema,
    execute: async (input) => {
      trail.record({ kind: 'tool_call', toolName: 'assess_exposure', content: input });
      if (input.monthlySpendQuote == null && input.monthlyHours == null) {
        const error = 'Need either monthlySpendQuote or monthlyHours.';
        trail.record({ kind: 'error', toolName: 'assess_exposure', content: error });
        return { ok: false, error };
      }
      // Spend wins when both are present (the model sometimes adds a filler
      // monthlyHours). The risk engine otherwise prefers hours.
      const useSpend = input.monthlySpendQuote != null;
      // Re-clamp risk caps server-side — never trust model-supplied safety thresholds.
      const maxSlippage = Math.min(input.maxSlippage, 0.02);
      const liquidationBufferMin = Math.max(input.liquidationBufferMin, 0.2);
      if (maxSlippage !== input.maxSlippage || liquidationBufferMin !== input.liquidationBufferMin) {
        trail.record({ kind: 'observation', toolName: 'assess_exposure', content: 'Risk caps clamped to policy bounds (slippage ≤ 2%, liq-buffer ≥ 20%).' });
      }
      ctx.intent = {
        monthlySpendQuote: useSpend ? input.monthlySpendQuote : undefined,
        monthlyHours: useSpend ? undefined : input.monthlyHours,
        hedgeRatio: input.hedgeRatio,
        horizonMonths: input.horizonMonths,
        leverage: input.leverage,
        liquidationBufferMin,
        maxSlippage,
      };
      const out = { ok: true, intent: ctx.intent };
      trail.record({ kind: 'tool_result', toolName: 'assess_exposure', content: out });
      return out;
    },
  });

  const compute_hedge = tool({
    description:
      'Compute the validated hedge from the live H100 index and the execution venue. The ONLY source of numbers. Returns a planId.',
    inputSchema: computeHedgeSchema,
    execute: async () => {
      trail.record({ kind: 'tool_call', toolName: 'compute_hedge', content: {} });
      if (!ctx.intent) {
        const error = 'Call assess_exposure first.';
        trail.record({ kind: 'error', toolName: 'compute_hedge', content: error });
        return { ok: false, error };
      }
      try {
        const balance = await executor.getBankBalance(ctx.route.primaryVenueKey);
        const account = toAccountState(balance, reserveFor(balance));
        const projection = await projectHedge(ctx.intent, ctx.route, executor, account);
        const stored = planStore.put(ctx.intent, projection);
        const out = summarizeProjection(stored.planId, projection, balance);
        trail.record({ kind: 'tool_result', toolName: 'compute_hedge', content: out });
        return out;
      } catch (e) {
        const fe = normalizeExecutionError(e);
        trail.record({ kind: 'error', toolName: 'compute_hedge', content: fe });
        return { ok: false, error: fe.message, code: fe.code };
      }
    },
  });

  const place_hedge = tool({
    description: 'Place the previously computed hedge on-chain. Requires the planId returned by compute_hedge.',
    inputSchema: placeHedgeSchema,
    execute: async ({ planId }) => {
      trail.record({ kind: 'tool_call', toolName: 'place_hedge', content: { planId } });
      const stored = planStore.get(planId);
      if (!stored) {
        const error = 'Unknown planId — run compute_hedge first.';
        trail.record({ kind: 'error', toolName: 'place_hedge', content: error });
        return { ok: false, error };
      }
      // Single-use: a plan is consumed once placed, and a turn places at most one hedge.
      if (stored.placed || ctx.result) {
        const error = 'This hedge was already placed — run compute_hedge for a new one.';
        trail.record({ kind: 'error', toolName: 'place_hedge', content: error });
        return { ok: false, error };
      }
      let placedVenueKey: string | undefined; // set immediately before broadcast (enables reconciliation)
      try {
        // Re-validate the CONFIRMED plan against fresh live data — project from the
        // STORED intent (not the mutable ctx.intent) so the placed hedge is the one
        // the user approved.
        const balance = await executor.getBankBalance(ctx.route.primaryVenueKey);
        const account = toAccountState(balance, reserveFor(balance));
        const fresh = await projectHedge(stored.intent, ctx.route, executor, account);
        if (!fresh.venue.ok || !fresh.venue.plan) {
          const codes = fresh.venue.errors.map((e) => e.code);
          const error = `Plan no longer valid (market moved): ${codes.join(', ')}`;
          trail.record({ kind: 'error', toolName: 'place_hedge', content: error });
          return { ok: false, error, errors: fresh.venue.errors.map((e) => ({ code: e.code, message: e.message })) };
        }
        // Drift guard: the executed plan must match the confirmed one (same venue,
        // notional within tolerance) — otherwise make the model re-confirm.
        const approved = stored.projection.venue.plan;
        if (approved) {
          const drift = Math.abs(fresh.venue.plan.notional - approved.notional) / approved.notional;
          if (fresh.venueKey !== stored.projection.venueKey || drift > 0.02) {
            const error = 'Plan drifted (market moved or venue changed) — re-run compute_hedge to confirm a fresh hedge.';
            trail.record({ kind: 'error', toolName: 'place_hedge', content: error });
            return { ok: false, error, code: 'PLAN_DRIFTED' };
          }
        }
        const venuePlan = fresh.venue.plan;
        const venueProfile = getMarketProfile(fresh.venueKey);
        const depth = await executor.getOrderbookDepth(fresh.venueKey);
        // A thin book that can't fill this size is a hard abort — don't fall back
        // to the oracle price (which risks a non-fill).
        const execPrice = worstFillPrice(depth.asks, venuePlan.size);
        if (execPrice == null) {
          const error = 'The venue order book is too thin to fill this size right now — try a smaller size or the deeper fallback venue.';
          trail.record({ kind: 'error', toolName: 'place_hedge', content: error });
          return { ok: false, error, code: 'TooThinLiquidity' };
        }
        const order = buildQuantizedOrder({
          quoteDecimals: venueProfile.quoteDecimals,
          tickSize: venueProfile.tickSize,
          minQuantityTick: venueProfile.minQuantityTick,
          execPrice,
          quantity: venuePlan.size,
          leverage: venuePlan.leverage,
          maxSlippage: stored.intent.maxSlippage,
        });
        // Re-check the PADDED broadcast margin (the validated plan used un-padded
        // oracle margin) against usable balance so the chain doesn't reject + burn gas.
        const usable = account.availableQuote - account.safetyReserveQuote;
        if (order.humanMargin + venuePlan.takerFeeQuote > usable + 1e-9) {
          const error = 'Not enough USDC to post margin at the padded execution price — fund the wallet and retry.';
          trail.record({ kind: 'error', toolName: 'place_hedge', content: error });
          return { ok: false, error, code: 'INSUFFICIENT_BALANCE' };
        }
        placedVenueKey = fresh.venueKey; // we are about to broadcast — enable reconciliation
        const res = await executor.openHedge(fresh.venueKey, order);
        planStore.markPlaced(planId); // consume only AFTER a successful broadcast
        ctx.result = {
          txHash: res.txHash,
          explorerUrl: res.explorerUrl,
          venueKey: res.venueKey,
          side: 'long',
          size: order.humanQuantity,
          notional: venuePlan.notional,
          margin: order.humanMargin,
        };
        deps.onPosition?.({ ...ctx.result });
        const out = { ok: true, ...ctx.result };
        trail.record({ kind: 'tool_result', toolName: 'place_hedge', content: out });
        return out;
      } catch (e) {
        const fe = normalizeExecutionError(e);
        // The broadcast may have LANDED despite the error (post-submission timeout).
        // For uncertain errors, reconcile against the chain before reporting failure.
        if (placedVenueKey && isUncertainExecutionError(fe.code)) {
          try {
            const pos = await executor.getPosition(placedVenueKey);
            if (pos && pos.direction === 'long' && pos.quantity > 0) {
              planStore.markPlaced(planId);
              ctx.result = {
                txHash: '',
                explorerUrl: '',
                venueKey: placedVenueKey,
                side: 'long',
                size: pos.quantity,
                notional: pos.quantity * pos.entryPrice,
                margin: pos.margin,
              };
              deps.onPosition?.({ ...ctx.result });
              const out = { ok: true, unconfirmed: true, note: 'Settlement confirmation lagged, but the position is open on-chain.', ...ctx.result };
              trail.record({ kind: 'tool_result', toolName: 'place_hedge', content: out });
              return out;
            }
          } catch {
            /* reconciliation read failed — fall through to the unconfirmed message */
          }
          const msg = 'Order submitted but on-chain confirmation could not be verified — check the explorer or your open positions before retrying.';
          trail.record({ kind: 'error', toolName: 'place_hedge', content: msg });
          return { ok: false, error: msg, code: 'SUBMITTED_UNCONFIRMED' };
        }
        trail.record({ kind: 'error', toolName: 'place_hedge', content: fe });
        return { ok: false, error: fe.message, code: fe.code };
      }
    },
  });

  const summarize = tool({
    description: 'Return the structured facts of this hedge for the final plain-language confirmation.',
    inputSchema: summarizeSchema,
    execute: async () => {
      const out = { intent: ctx.intent ?? null, result: ctx.result ?? null };
      trail.record({ kind: 'tool_result', toolName: 'summarize', content: out });
      return out;
    },
  });

  return { assess_exposure, compute_hedge, place_hedge, summarize };
}
