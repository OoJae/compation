/**
 * The 4 orchestrator tools. The model expresses INTENT and references plans by
 * id; it can NEVER pass a size/notional/margin/quantity — there is no such
 * field on any schema. Every number comes from the risk engine via these tools.
 */
import { tool, type ToolSet } from 'ai';
import { z } from 'zod';
import { getMarketProfile, type HedgeRoute } from '@compation/shared';
import type { HedgeIntent } from '../risk/index.js';
import { buildQuantizedOrder, worstFillPrice, toAccountState, type InjectiveExecutor } from '../injective/index.js';
import { projectHedge, type ProjectionResult } from './projection.js';
import { PlanStore } from './plan-store.js';
import type { Trail } from './trail.js';

// --- schemas (exported for the structural size-proof test) ---
export const assessExposureSchema = z.object({
  monthlySpendQuote: z.number().positive().optional().describe('USD spent on H100 GPUs per month'),
  monthlyHours: z.number().positive().optional().describe('H100-hours per month, if the user states it directly'),
  hedgeRatio: z.number().gt(0).lte(1).default(0.8).describe('fraction of the exposure to hedge'),
  leverage: z.number().positive().max(5).default(2),
  horizonMonths: z.number().positive().default(1),
  liquidationBufferMin: z.number().min(0).max(1).default(0.4),
  maxSlippage: z.number().min(0).max(0.5).default(0.005),
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

export function makeTools(deps: {
  executor: InjectiveExecutor;
  trail: Trail;
  planStore: PlanStore;
  ctx: TurnContext;
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
      ctx.intent = {
        monthlySpendQuote: useSpend ? input.monthlySpendQuote : undefined,
        monthlyHours: useSpend ? undefined : input.monthlyHours,
        hedgeRatio: input.hedgeRatio,
        horizonMonths: input.horizonMonths,
        leverage: input.leverage,
        liquidationBufferMin: input.liquidationBufferMin,
        maxSlippage: input.maxSlippage,
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
      const balance = await executor.getBankBalance(ctx.route.primaryVenueKey);
      const account = toAccountState(balance, reserveFor(balance));
      const projection = await projectHedge(ctx.intent, ctx.route, executor, account);
      const stored = planStore.put(ctx.intent, projection);
      const out = summarizeProjection(stored.planId, projection, balance);
      trail.record({ kind: 'tool_result', toolName: 'compute_hedge', content: out });
      return out;
    },
  });

  const place_hedge = tool({
    description: 'Place the previously computed hedge on-chain. Requires the planId returned by compute_hedge.',
    inputSchema: placeHedgeSchema,
    execute: async ({ planId }) => {
      trail.record({ kind: 'tool_call', toolName: 'place_hedge', content: { planId } });
      const stored = planStore.get(planId);
      if (!stored || !ctx.intent) {
        const error = 'Unknown planId — run compute_hedge first.';
        trail.record({ kind: 'error', toolName: 'place_hedge', content: error });
        return { ok: false, error };
      }
      // Drift guard: re-fetch live data and re-validate before broadcasting.
      const balance = await executor.getBankBalance(ctx.route.primaryVenueKey);
      const account = toAccountState(balance, reserveFor(balance));
      const fresh = await projectHedge(ctx.intent, ctx.route, executor, account);
      if (!fresh.venue.ok || !fresh.venue.plan) {
        const codes = fresh.venue.errors.map((e) => e.code);
        const error = `Plan no longer valid (market moved): ${codes.join(', ')}`;
        trail.record({ kind: 'error', toolName: 'place_hedge', content: error });
        return { ok: false, error, errors: fresh.venue.errors.map((e) => ({ code: e.code, message: e.message })) };
      }
      const venuePlan = fresh.venue.plan;
      const venueProfile = getMarketProfile(fresh.venueKey);
      const depth = await executor.getOrderbookDepth(fresh.venueKey);
      const execPrice = worstFillPrice(depth.asks, venuePlan.size) ?? venuePlan.entryPrice;
      const order = buildQuantizedOrder({
        quoteDecimals: venueProfile.quoteDecimals,
        tickSize: venueProfile.tickSize,
        minQuantityTick: venueProfile.minQuantityTick,
        execPrice,
        quantity: venuePlan.size,
        leverage: venuePlan.leverage,
        maxSlippage: ctx.intent.maxSlippage,
      });
      const res = await executor.openHedge(fresh.venueKey, order);
      ctx.result = {
        txHash: res.txHash,
        explorerUrl: res.explorerUrl,
        venueKey: res.venueKey,
        side: 'long',
        size: order.humanQuantity,
        notional: venuePlan.notional,
        margin: order.humanMargin,
      };
      const out = { ok: true, ...ctx.result };
      trail.record({ kind: 'tool_result', toolName: 'place_hedge', content: out });
      return out;
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
