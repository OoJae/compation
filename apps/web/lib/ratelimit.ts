/**
 * Best-effort, dependency-free rate limiting for the PUBLIC demo. The hosted app
 * signs from a funded wallet (EXECUTOR=sdk) with no auth, so these guards stop
 * trivial `while true` abuse of /api/chat (wallet/gas/Azure) and /api/x402
 * (testnet-USDC drain). State is per warm serverless instance and resets on cold
 * start — NOT bulletproof across instances; for production use a shared store
 * (Vercel KV / Upstash Redis). It raises the bar with zero external setup.
 */
type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export interface RateResult {
  ok: boolean;
  retryAfterSec: number;
  remaining: number;
}

/** Fixed-window per-key limiter. */
export function rateLimit(key: string, limit: number, windowMs: number): RateResult {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now >= b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSec: 0, remaining: limit - 1 };
  }
  if (b.count >= limit) {
    return { ok: false, retryAfterSec: Math.ceil((b.resetAt - now) / 1000), remaining: 0 };
  }
  b.count += 1;
  return { ok: true, retryAfterSec: 0, remaining: limit - b.count };
}

let x402Window: Bucket = { count: 0, resetAt: 0 };

/** Global cumulative cap on x402 settlements across ALL callers (drain ceiling). */
export function x402GlobalAllow(maxPerWindow: number, windowMs: number): boolean {
  const now = Date.now();
  if (now >= x402Window.resetAt) x402Window = { count: 0, resetAt: now + windowMs };
  if (x402Window.count >= maxPerWindow) return false;
  x402Window.count += 1;
  return true;
}

/** Best-effort client IP from proxy headers (Vercel sets x-forwarded-for). */
export function clientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0]!.trim();
  return req.headers.get('x-real-ip') ?? 'unknown';
}
