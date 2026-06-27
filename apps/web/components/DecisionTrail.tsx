import type { AnyPart } from './types';

const LABELS: Record<string, string> = {
  assess_exposure: 'Assess exposure',
  compute_hedge: 'Compute hedge',
  place_hedge: 'Place hedge',
  summarize: 'Summarize',
};

function dotClass(state?: string): string {
  switch (state) {
    case 'output-available':
      return 'bg-emerald-400';
    case 'output-error':
      return 'bg-red-400';
    case 'input-available':
      return 'bg-sky-400';
    default:
      return 'bg-amber-400 animate-pulse';
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function summary(name: string, output: any): string | null {
  if (!output) return null;
  if (name === 'assess_exposure') {
    const i = output.intent;
    if (!i) return output.error ?? null;
    if (i.monthlySpendQuote)
      return `$${Number(i.monthlySpendQuote).toLocaleString()}/mo · hedge ${Math.round(i.hedgeRatio * 100)}% · ${i.leverage}×`;
    if (i.monthlyHours) return `${i.monthlyHours} H100-h/mo · hedge ${Math.round(i.hedgeRatio * 100)}%`;
    return null;
  }
  if (name === 'compute_hedge') {
    if (output.ok === false) return output.errors?.map((e: any) => e.code).join(', ') ?? output.error ?? 'rejected';
    return `H100 $${Math.round(output.h100?.notional ?? 0).toLocaleString()} → ${output.venueTicker}`;
  }
  if (name === 'place_hedge') {
    if (output.ok === false) return output.error ?? 'failed';
    return output.txHash ? `tx ${String(output.txHash).slice(0, 12)}…` : 'placed';
  }
  return null;
}

export function DecisionTrail({ toolParts }: { toolParts: AnyPart[] }) {
  if (toolParts.length === 0) return null;
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4">
      <div className="mb-3 text-xs font-medium uppercase tracking-wider text-neutral-500">Decision trail</div>
      <ol className="space-y-3">
        {toolParts.map((p, i) => {
          const name = p.type.replace('tool-', '');
          const s = summary(name, p.output);
          return (
            <li key={i} className="flex items-start gap-3">
              <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dotClass(p.state)}`} />
              <div className="min-w-0 flex-1">
                <div className="text-sm text-neutral-200">{LABELS[name] ?? name}</div>
                {s ? <div className="tnum truncate text-xs text-neutral-500">{s}</div> : null}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
