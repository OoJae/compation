/**
 * Verify the runtime LLM is live AND can call tools (the orchestrator depends
 * on tool-calling). Run: pnpm --filter @compation/agent azure:smoke
 */
import { loadEnv } from './_shared';
loadEnv();

import { generateText, tool, stepCountIs } from 'ai';
import { z } from 'zod';
import { getModel, modelInfo } from '../src/llm/provider';

async function main(): Promise<void> {
  console.log(`Model: ${modelInfo()}`);
  const model = await getModel();

  // 1) Plain generation
  const basic = await generateText({
    model,
    prompt: 'Reply with exactly this and nothing else: Compation Azure online',
  });
  console.log(`\n[1] text generation: "${basic.text.trim()}"`);

  // 2) Tool-calling round-trip (the orchestrator needs this to work)
  let toolFired = false;
  const withTool = await generateText({
    model,
    prompt: 'Use the multiply tool to compute 6 times 7, then tell me the product in a short sentence.',
    tools: {
      multiply: tool({
        description: 'Multiply two numbers and return the product.',
        inputSchema: z.object({ a: z.number(), b: z.number() }),
        execute: async ({ a, b }) => {
          toolFired = true;
          return { product: a * b };
        },
      }),
    },
    stopWhen: stepCountIs(4),
  });
  console.log(`[2] tool-calling: fired=${toolFired} | final="${withTool.text.trim()}"`);

  if (!toolFired) {
    console.error('\n❌ Tool was never called — tool-calling is NOT working on this model/deployment.');
    process.exit(1);
  }
  console.log('\n✅ LLM is live and tool-calling works.');
}

main().catch((e) => {
  console.error('\nFATAL:', (e as Error)?.message ?? e);
  process.exit(1);
});
