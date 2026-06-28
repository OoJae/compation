import type { AgentMeta } from './types';
import { Logo } from '@/components/Logo';

function Pill({ label, value, tone = 'neutral' }: { label: string; value: string; tone?: 'neutral' | 'azure' | 'amber' }) {
  const toneCls =
    tone === 'azure'
      ? 'border-[rgba(125,211,252,0.35)] text-sky'
      : tone === 'amber'
        ? 'border-[rgba(245,181,68,0.35)] text-gold'
        : 'border-[rgba(255,255,255,0.14)] text-mut';
  return (
    <span className={`inline-flex items-center gap-[7px] rounded-full border px-[11px] py-[6px] ${toneCls}`}>
      <span className="text-mut3">{label}</span>
      <span className="tnum">{value}</span>
    </span>
  );
}

export function Header({ meta }: { meta: AgentMeta }) {
  return (
    <header className="sticky top-0 z-20 border-b border-[rgba(255,255,255,0.08)] bg-[rgba(7,8,11,0.72)] backdrop-blur-[14px]">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-[14px] px-[clamp(16px,3vw,32px)] py-[13px]">
        <div className="flex min-w-0 items-center gap-3">
          <Logo size={28} />
          <div className="min-w-0">
            <div className="flex items-center gap-[9px]">
              <span className="live-dot inline-block h-2 w-2 rounded-full bg-teal shadow-[0_0_11px_#34D399]" />
              <h1 className="font-display text-[18px] font-bold tracking-[-0.02em] text-paper">Compation</h1>
            </div>
            <p className="mt-px overflow-hidden text-ellipsis whitespace-nowrap text-[12.5px] text-mut">
              Autonomous hedging for NVIDIA&nbsp;H100 compute costs — on Injective.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 font-mono text-[11.5px]">
          <Pill label="brain" value={meta.model.startsWith('Azure') ? 'Azure OpenAI' : meta.model} tone="azure" />
          <Pill label="exec" value={meta.executor} tone={meta.executor === 'sdk' ? 'amber' : 'neutral'} />
          <Pill label="route" value={meta.routeKey} />
        </div>
      </div>
    </header>
  );
}
