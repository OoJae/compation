/**
 * Run one hedge turn: the model drives the 4 tools (assess → compute → place →
 * summarize). Used by the headless CLI driver now and the web route later
 * (a streaming wrapper is added with the UI).
 */
import {
  generateText,
  streamText,
  stepCountIs,
  convertToModelMessages,
  type LanguageModel,
  type UIMessage,
} from 'ai';
import type { HedgeRoute } from '@compation/shared';
import type { InjectiveExecutor } from '../injective/index';
import { makeTools, type TurnContext, type OpenedPosition } from './tools';
import { PlanStore } from './plan-store';
import { SYSTEM_PROMPT } from './system-prompt';
import type { Trail } from './trail';

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

export interface StreamHedgeOptions {
  messages: UIMessage[];
  model: LanguageModel;
  executor: InjectiveExecutor;
  route: HedgeRoute;
  trail: Trail;
  maxSteps?: number;
  onPosition?: (p: OpenedPosition) => void;
}

/**
 * Streaming variant for the web route: the model drives the same 4 tools, and
 * the response is a UI message stream (text + reasoning + tool parts) that
 * `useChat` consumes. The decision trail renders client-side from the tool
 * parts; `trail` here persists server-side (best-effort).
 */
export async function streamHedgeTurn(opts: StreamHedgeOptions): Promise<Response> {
  const ctx: TurnContext = { route: opts.route };
  const planStore = new PlanStore();
  const tools = makeTools({
    executor: opts.executor,
    trail: opts.trail,
    planStore,
    ctx,
    onPosition: opts.onPosition,
  });

  const result = streamText({
    model: opts.model,
    system: SYSTEM_PROMPT,
    messages: await convertToModelMessages(opts.messages),
    tools,
    stopWhen: stepCountIs(opts.maxSteps ?? 8),
    onStepFinish: ({ text }) => {
      if (text && text.trim()) opts.trail.record({ kind: 'reasoning', content: text.trim() });
    },
  });

  return result.toUIMessageStreamResponse({ sendReasoning: true });
}
