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
  createSession,
  recordPosition,
  recordPaymentReceipt,
  payForMarketData,
  getIdentity,
  PrismaTrail,
  streamHedgeTurn,
  friendlyTurnError,
  type X402Receipt,
} from '@compation/agent';
import { getRoute, getMarketProfile } from '@compation/shared';
import type { AgentMeta, AgentIdentity } from '@/components/types';

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

export function agentIdentity(): AgentIdentity {
  return getIdentity();
}

/** The "agent pays for itself" x402 micropayment (real, settles on-chain). */
export async function runX402(): Promise<X402Receipt> {
  const receipt = await payForMarketData();
  // Record whenever a settlement tx exists — a tx can land even if confirmation
  // flakes, so binding on txHash (not ok) avoids losing a real on-chain payment.
  if (receipt.txHash) {
    await recordPaymentReceipt({ kind: 'x402', amount: receipt.amountUsdc, denom: 'USDC', txHash: receipt.txHash });
  }
  return receipt;
}

export async function runChat(messages: UIMessage[]): Promise<Response> {
  try {
    const model = await getModel();
    const executor = createExecutor();
    const route = activeRoute();
    const sessionId = await createSession(route.key);
    const trail = new PrismaTrail(sessionId);
    return await streamHedgeTurn({
      messages,
      model,
      executor,
      route,
      trail,
      onPosition: (p) => void recordPosition(sessionId, p),
    });
  } catch (e) {
    // Setup failure (e.g. Azure unconfigured / wallet missing) before the stream
    // starts — surface a friendly line, never a stack trace. useChat reads the
    // body text as error.message.
    console.error('[compation] runChat failed:', e);
    return new Response(friendlyTurnError(e), { status: 500, headers: { 'content-type': 'text/plain' } });
  }
}
