/**
 * Decision-trail recorder. In-memory for the headless driver; a Prisma-backed
 * impl is added when the web UI lands. Every observation/tool-call/result/error
 * is captured in order so the timeline can be rendered and audited.
 */
export type StepKind = 'reasoning' | 'tool_call' | 'tool_result' | 'error' | 'observation';

export interface TrailStep {
  seq: number;
  kind: StepKind;
  toolName?: string;
  content: unknown;
  at: number;
}

export interface Trail {
  record(step: { kind: StepKind; toolName?: string; content: unknown }): TrailStep;
  steps(): TrailStep[];
}

export class InMemoryTrail implements Trail {
  private list: TrailStep[] = [];
  private seq = 0;

  record(step: { kind: StepKind; toolName?: string; content: unknown }): TrailStep {
    const entry: TrailStep = { seq: this.seq++, at: Date.now(), ...step };
    this.list.push(entry);
    return entry;
  }

  steps(): TrailStep[] {
    return this.list;
  }
}
