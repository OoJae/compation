import type { UIMessage } from 'ai';
import { runChat } from '@/lib/agent.server';
import { rateLimit, clientIp } from '@/lib/ratelimit';

// sdk-ts / gRPC / signing are node-only.
export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_MESSAGES = 40;

export async function POST(req: Request): Promise<Response> {
  // Public, wallet-signing endpoint: rate-limit per IP (best-effort, see ratelimit.ts).
  const rl = rateLimit(`chat:${clientIp(req)}`, 8, 60_000);
  if (!rl.ok) {
    return new Response('Too many requests — please wait a moment and try again.', {
      status: 429,
      headers: { 'retry-after': String(rl.retryAfterSec) },
    });
  }
  try {
    const { messages } = (await req.json()) as { messages: UIMessage[] };
    if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_MESSAGES) {
      return new Response('Invalid request.', { status: 400 });
    }
    return await runChat(messages);
  } catch (e) {
    console.error('[compation] /api/chat failed:', e);
    return new Response('Something interrupted the agent. Please try again.', { status: 500 });
  }
}
