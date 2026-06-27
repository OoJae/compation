/** A Trail that also persists each step to SQLite (best-effort). */
import { InMemoryTrail, type Trail, type StepKind, type TrailStep } from '../orchestrator/trail';
import { persistStep } from './repo';

export class PrismaTrail implements Trail {
  private readonly mem = new InMemoryTrail();

  constructor(private readonly sessionId: string | null) {}

  record(step: { kind: StepKind; toolName?: string; content: unknown }): TrailStep {
    const recorded = this.mem.record(step);
    if (this.sessionId) void persistStep(this.sessionId, recorded);
    return recorded;
  }

  steps(): TrailStep[] {
    return this.mem.steps();
  }
}
