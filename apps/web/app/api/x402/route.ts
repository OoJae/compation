import { runX402 } from '@/lib/agent.server';

export const runtime = 'nodejs';
export const maxDuration = 60;

/** Trigger the agent's x402 self-payment. */
export async function POST(): Promise<Response> {
  const receipt = await runX402();
  return Response.json(receipt);
}
