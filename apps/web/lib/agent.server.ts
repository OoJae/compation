/**
 * Server-only bindings. Loads the repo-root .env (where the agent's secrets
 * live), exposes display metadata for the header, and runs the streaming agent
 * turn. NEVER import this from a client component — the private key lives here.
 */
import { config } from 'dotenv';
import { resolve } from 'node:path';
import type { UIMessage } from 'ai';
import {
  createExecutor,
  getModel,
  modelInfo,
  InMemoryTrail,
  streamHedgeTurn,
} from '@compation/agent';
import { getRoute, getMarketProfile } from '@compation/shared';
import type { AgentMeta } from '@/components/types';

// next dev runs with cwd = apps/web → repo root is two up.
config({ path: resolve(process.cwd(), '../../.env') });

function activeRoute() {
  return getRoute(process.env.COMPATION_ROUTE ?? 'dev');
}

export function agentMeta(): AgentMeta {
  const route = activeRoute();
  const index = getMarketProfile(route.indexKey);
  const venue = getMarketProfile(route.primaryVenueKey);
  const fallbackKey = route.fallbackVenueKeys[0];
  return {
    model: modelInfo(),
    executor: process.env.EXECUTOR ?? 'fake',
    routeKey: route.key,
    routeLabel: route.label,
    indexTicker: index.marketTicker,
    venueTicker: venue.marketTicker,
    fallbackTicker: fallbackKey ? getMarketProfile(fallbackKey).marketTicker : null,
    proxy: route.proxy,
  };
}

export async function runChat(messages: UIMessage[]): Promise<Response> {
  const model = await getModel();
  const executor = createExecutor();
  const route = activeRoute();
  const trail = new InMemoryTrail();
  return streamHedgeTurn({ messages, model, executor, route, trail });
}
