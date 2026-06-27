import { runX402 } from '@/lib/agent.server';
import { rateLimit, clientIp, x402GlobalAllow } from '@/lib/ratelimit';

export const runtime = 'nodejs';
export const maxDuration = 60;

/** Trigger the agent's x402 self-payment (real testnet USDC spend from the wallet). */
export async function POST(req: Request): Promise<Response> {
  // Each call spends real testnet USDC: per-IP limit + a global hourly drain ceiling.
  const rl = rateLimit(`x402:${clientIp(req)}`, 3, 60_000);
  if (!rl.ok) {
    return Response.json(
      { ok: false, error: 'Too many payments — try again shortly.' },
      { status: 429, headers: { 'retry-after': String(rl.retryAfterSec) } },
    );
  }
  if (!x402GlobalAllow(40, 60 * 60_000)) {
    return Response.json({ ok: false, error: 'Demo spend cap reached for this hour.' }, { status: 429 });
  }
  const receipt = await runX402();
  return Response.json(receipt);
}
