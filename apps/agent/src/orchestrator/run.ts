/**
 * Run one hedge turn: the model drives the 4 tools (assess → compute → place →
 * summarize). Used by the headless CLI driver now and the web route later
 * (a streaming wrapper is added with the UI).
 */
import { generateText, stepCountIs, type LanguageModel } from 'ai';
import type { HedgeRoute } from '@compation/shared';
import type { InjectiveExecutor } from '../injective/index.js';
import { makeTools, type TurnContext } from './tools.js';
import { PlanStore } from './plan-store.js';
import { SYSTEM_PROMPT } from './system-prompt.js';
import type { Trail } from './trail.js';

export interface RunHedgeOptions {
  prompt: string;
  model: LanguageModel;
  executor: InjectiveExecutor;
  route: HedgeRoute;
  trail: Trail;
  maxSteps?: number;
}

export interface RunHedgeResult {
  text: string;
  ctx: TurnContext;
}

export async function runHedgeTurn(opts: RunHedgeOptions): Promise<RunHedgeResult> {
  const ctx: TurnContext = { route: opts.route };
  const planStore = new PlanStore();
  const tools = makeTools({ executor: opts.executor, trail: opts.trail, planStore, ctx });

  const res = await generateText({
    model: opts.model,
    system: SYSTEM_PROMPT,
    prompt: opts.prompt,
    tools,
    stopWhen: stepCountIs(opts.maxSteps ?? 8),
    onStepFinish: ({ text }) => {
      if (text && text.trim()) opts.trail.record({ kind: 'reasoning', content: text.trim() });
    },
  });

  return { text: res.text, ctx };
}
