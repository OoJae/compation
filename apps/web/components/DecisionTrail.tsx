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
      return 'bg-teal shadow-[0_0_8px_rgba(52,211,153,0.5)]';
    case 'output-error':
      return 'bg-rose shadow-[0_0_8px_rgba(251,113,133,0.5)]';
    case 'input-available':
      return 'bg-sky shadow-[0_0_8px_rgba(125,211,252,0.5)]';
    default:
      return 'bg-gold shadow-[0_0_8px_rgba(245,181,68,0.6)] animate-pulse';
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
    <div className="border border-[rgba(255,255,255,0.08)] rounded-[15px] bg-[linear-gradient(180deg,rgba(255,255,255,0.016),rgba(255,255,255,0))] p-[17px]">
      <div className="mb-[15px] font-mono text-[10.5px] uppercase tracking-[0.16em] text-mut3">Decision trail</div>
      <ol className="flex flex-col gap-[14px]">
        {toolParts.map((p, i) => {
          const name = p.type.replace('tool-', '');
          const s = summary(name, p.output);
          return (
            <li key={i} className="flex items-start gap-[11px]">
              <span className={`mt-[3px] h-[9px] w-[9px] shrink-0 rounded-full ${dotClass(p.state)}`} />
              <div className="min-w-0 flex-1">
                <div className="text-[13.5px] font-medium text-paper">{LABELS[name] ?? name}</div>
                {s ? <div className="tnum mt-[2px] truncate font-mono text-[11.5px] text-mut2">{s}</div> : null}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
