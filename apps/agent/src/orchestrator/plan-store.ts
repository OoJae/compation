/** Server-side store for computed plans. place_hedge references a plan by id, never by raw numbers. */
import type { HedgeIntent } from '../risk/index';
import type { ProjectionResult } from './projection';

export interface StoredPlan {
  planId: string;
  intent: HedgeIntent;
  projection: ProjectionResult;
  createdAt: number;
  /** Set once the plan has been broadcast — a plan is single-use. */
  placed?: boolean;
}

export class PlanStore {
  private map = new Map<string, StoredPlan>();

  put(intent: HedgeIntent, projection: ProjectionResult): StoredPlan {
    const planId = crypto.randomUUID();
    const stored: StoredPlan = { planId, intent, projection, createdAt: Date.now() };
    this.map.set(planId, stored);
    return stored;
  }

  get(planId: string): StoredPlan | undefined {
    return this.map.get(planId);
  }

  /** Mark a plan consumed AFTER a successful broadcast (so a failed broadcast stays replayable). */
  markPlaced(planId: string): void {
    const s = this.map.get(planId);
    if (s) s.placed = true;
  }
}
