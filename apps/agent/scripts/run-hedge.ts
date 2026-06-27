/**
 * Headless driver for the full agent loop: model → assess → compute → place →
 * summarize. The Tier-A rehearsal (EXECUTOR=fake) and the Tier-B on-chain proof
 * (EXECUTOR=sdk, COMPATION_ROUTE=dev) both run through here.
 *
 *   pnpm --filter @compation/agent hedge                       # fake, default prompt
 *   EXECUTOR=sdk COMPATION_ROUTE=dev pnpm --filter @compation/agent hedge "I spend $30/month on H100s, hedge most of it" --close
 */
import { loadEnv } from './_shared.js';
loadEnv();

import { getRoute } from '@compation/shared';
import { getModel, modelInfo } from '../src/llm/provider.js';
import { createExecutor } from '../src/injective/index.js';
import { runHedgeTurn, InMemoryTrail } from '../src/orchestrator/index.js';

const DEFAULT_PROMPT = 'I spend about $40,000/month renting H100 GPUs for my AI startup — hedge most of it.';

function arg(): { prompt: string; close: boolean } {
  const args = process.argv.slice(2);
  const prompt = args.find((a) => !a.startsWith('--')) ?? DEFAULT_PROMPT;
  return { prompt, close: args.includes('--close') };
}

async function main(): Promise<void> {
  const route = getRoute(process.env.COMPATION_ROUTE ?? 'dev');
  const executor = createExecutor(); // EXECUTOR=fake|sdk
  const model = await getModel();
  const trail = new InMemoryTrail();
  const { prompt, close } = arg();

  console.log(`route=${route.key} (${route.label})`);
  console.log(`executor=${executor.kind}  model=${modelInfo()}`);
  console.log(`\nUSER: ${prompt}\n`);

  const t0 = Date.now();
  const { text, ctx } = await runHedgeTurn({ prompt, model, executor, route, trail });
  const ms = Date.now() - t0;

  console.log('──── DECISION TRAIL ────');
  for (const s of trail.steps()) {
    const tag = s.toolName ? `${s.kind}:${s.toolName}` : s.kind;
    const body = typeof s.content === 'string' ? s.content : JSON.stringify(s.content);
    console.log(`#${String(s.seq).padStart(2, '0')} [${tag}] ${body}`.slice(0, 500));
  }

  console.log('\n──── ASSISTANT ────');
  console.log(text);

  if (ctx.result) {
    console.log(`\n✅ OPENED on ${ctx.result.venueKey}  size=${ctx.result.size}  notional≈${ctx.result.notional.toFixed(2)}  margin≈${ctx.result.margin.toFixed(2)}`);
    console.log(`   tx:  ${ctx.result.txHash}`);
    console.log(`   url: ${ctx.result.explorerUrl}`);
  }
  console.log(`\n(${ms}ms total)`);

  if (close && ctx.result) {
    console.log('\n──── CLOSING ────');
    const c = await executor.closeHedge(ctx.result.venueKey);
    console.log(`✅ CLOSED  tx: ${c.txHash}\n   url: ${c.explorerUrl}`);
  }
}

main().catch((e) => {
  console.error('\nFATAL:', (e as Error)?.stack ?? e);
  process.exit(1);
});
