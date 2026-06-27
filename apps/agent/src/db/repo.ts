/** Persistence helpers — all best-effort (a DB hiccup never breaks a hedge). */
import { prisma } from './client';
import type { TrailStep } from '../orchestrator/trail';

export async function createSession(route: string): Promise<string | null> {
  try {
    const s = await prisma.session.create({ data: { route } });
    return s.id;
  } catch {
    return null;
  }
}

export async function persistStep(sessionId: string, step: TrailStep): Promise<void> {
  try {
    await prisma.decisionStep.create({
      data: {
        sessionId,
        seq: step.seq,
        kind: step.kind,
        toolName: step.toolName ?? null,
        content: JSON.stringify(step.content ?? null),
      },
    });
  } catch {
    /* best-effort */
  }
}

export interface PositionRecord {
  venueKey: string;
  side: string;
  size: number;
  notional: number;
  margin: number;
  txHash: string;
  explorerUrl: string;
}

export async function recordPosition(sessionId: string | null, p: PositionRecord): Promise<void> {
  try {
    await prisma.position.create({
      data: {
        sessionId: sessionId ?? undefined,
        venueKey: p.venueKey,
        side: p.side,
        size: p.size,
        notional: p.notional,
        margin: p.margin,
        openTxHash: p.txHash,
        explorerUrl: p.explorerUrl,
        status: 'open',
      },
    });
  } catch {
    /* best-effort */
  }
}

export async function recordPaymentReceipt(p: {
  kind: string;
  amount: number;
  denom: string;
  txHash?: string;
  sessionId?: string | null;
}): Promise<void> {
  try {
    await prisma.paymentReceipt.create({
      data: {
        sessionId: p.sessionId ?? undefined,
        kind: p.kind,
        amount: p.amount,
        denom: p.denom,
        txHash: p.txHash ?? null,
      },
    });
  } catch {
    /* best-effort */
  }
}
