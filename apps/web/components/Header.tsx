import type { AgentMeta } from './types';

function Pill({ label, value, tone = 'neutral' }: { label: string; value: string; tone?: 'neutral' | 'azure' | 'amber' }) {
  const toneCls =
    tone === 'azure'
      ? 'border-sky-700/50 text-sky-300'
      : tone === 'amber'
        ? 'border-amber-700/50 text-amber-300'
        : 'border-neutral-700 text-neutral-300';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${toneCls}`}>
      <span className="text-neutral-500">{label}</span>
      <span className="tnum">{value}</span>
    </span>
  );
}

export function Header({ meta }: { meta: AgentMeta }) {
  return (
    <header className="border-b border-neutral-800/80 bg-neutral-950/60 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_12px] shadow-emerald-400/60" />
            <h1 className="text-lg font-semibold tracking-tight text-neutral-50">Compation</h1>
          </div>
          <p className="mt-0.5 text-sm text-neutral-400">
            Autonomous hedging for NVIDIA&nbsp;H100 compute costs — on Injective.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Pill label="brain" value={meta.model.startsWith('Azure') ? 'Azure OpenAI' : meta.model} tone="azure" />
          <Pill label="exec" value={meta.executor} tone={meta.executor === 'sdk' ? 'amber' : 'neutral'} />
          <Pill label="route" value={meta.routeKey} />
        </div>
      </div>
    </header>
  );
}
