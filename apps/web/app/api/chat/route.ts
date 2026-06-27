import type { UIMessage } from 'ai';
import { runChat } from '@/lib/agent.server';

// sdk-ts / gRPC / signing are node-only.
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: Request): Promise<Response> {
  try {
    const { messages } = (await req.json()) as { messages: UIMessage[] };
    return await runChat(messages);
  } catch (e) {
    console.error('[compation] /api/chat failed:', e);
    return new Response('Something interrupted the agent. Please try again.', { status: 500 });
  }
}
