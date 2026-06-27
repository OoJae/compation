import type { UIMessage } from 'ai';
import { runChat } from '@/lib/agent.server';

// sdk-ts / gRPC / signing are node-only.
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: Request): Promise<Response> {
  const { messages } = (await req.json()) as { messages: UIMessage[] };
  return runChat(messages);
}
