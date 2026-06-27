'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ComputeOutput } from './types';
import { usd, pct, num } from './format';

const PRESETS = [-20, 0, 20, 50];

export function HedgeDashboard({ compute }: { compute: ComputeOutput }) {
  const h = compute.h100;
  const P0 = h.indexPrice;
  const monthlyBill = h.exposureHours * P0; // Q × P0 — the full monthly compute bill
  const hedgeRatio = h.hedgeRatio;

  const [pct100, setPct100] = useState(20); // slider, integer percent
  const [liveIndex, setLiveIndex] = useState<number | null>(null);

  // Poll the real on-chain H100 index — paused while the tab is hidden.
  useEffect(() => {
    let alive = true;
    const load = async () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      try {
        const r = await fetch('/api/index', { cache: 'no-store' });
        const j = (await r.json()) as { h100Index: number | null };
        if (alive && typeof j.h100Index === 'number' && j.h100Index > 0) setLiveIndex(j.h100Index);
      } catch {
        /* ignore */
      }
    };
    void load();
    const id = setInterval(load, 10_000);
    const onVis = () => {
      if (document.visibilityState === 'visible') void load();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      alive = false;
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  const displayIndex = liveIndex ?? P0; // header + slider baseline use the same number
  const delta = pct100 / 100;
  const sim = useMemo(() => {
    // Round the components once so the three stat cards satisfy net = bill − hedge exactly.
    const billDelta = Math.round(monthlyBill * delta);
    const hedgePnl = Math.round(hedgeRatio * monthlyBill * delta);
    return {
      newIndex: displayIndex * (1 + delta),
      newBill: monthlyBill + billDelta,
      billDelta,
      hedgePnl,
      netImpact: billDelta - hedgePnl,
    };
  }, [monthlyBill, hedgeRatio, delta, displayIndex]);

  const rising = delta >= 0;
  const barFrac = Math.min(1, Math.abs(delta) / 0.5); // full bar at ±50%
  const hedgeW = barFrac * hedgeRatio * 100;
  const netW = barFrac * (1 - hedgeRatio) * 100;

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-neutral-500">Live hedge dashboard</span>
        <span className="inline-flex items-center gap-1.5 text-xs text-neutral-400">
          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
          H100 index{' '}
          <span className="tnum text-emerald-300">{usd(displayIndex)}/hr</span>
        </span>
      </div>

      <div className="mb-3 text-xs text-neutral-500">
        Monthly compute bill <span className="tnum text-neutral-200">{usd(monthlyBill)}</span> · hedged{' '}
        <span className="tnum text-neutral-200">{pct(hedgeRatio)}</span> on H100
      </div>

      {/* What-if slider */}
      <div className="mb-3">
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="text-neutral-500">If the H100 rate moves</span>
          <span className="tnum text-neutral-200">
            {rising ? '+' : ''}
            {pct100}% → {usd(sim.newIndex)}/hr
          </span>
        </div>
        <input
          type="range"
          min={-50}
          max={50}
          step={1}
          value={pct100}
          onChange={(e) => setPct100(Number(e.target.value))}
          aria-label="H100 rental rate change"
          aria-valuetext={`${rising ? '+' : ''}${pct100} percent`}
          className="w-full accent-emerald-500"
        />
        <div className="mt-1 flex gap-1">
          {PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => setPct100(p)}
              aria-pressed={pct100 === p}
              className={`rounded px-1.5 py-0.5 text-[11px] ${
                pct100 === p ? 'bg-neutral-700 text-neutral-100' : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              {p > 0 ? '+' : ''}
              {p}%
            </button>
          ))}
        </div>
      </div>

      {/* Outcome */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <Stat label="Compute bill" value={usd(sim.newBill)} sub={`${rising ? '+' : ''}${usd(sim.billDelta)}`} subTone={rising ? 'red' : 'emerald'} />
        <Stat label="Hedge P&L" value={`${sim.hedgePnl >= 0 ? '+' : ''}${usd(sim.hedgePnl)}`} subTone="neutral" sub="long H100" valueTone={sim.hedgePnl >= 0 ? 'emerald' : 'red'} />
        <Stat label="Net impact" value={`${sim.netImpact >= 0 ? '+' : ''}${usd(sim.netImpact)}`} sub={`${pct(hedgeRatio)} protected`} valueTone={Math.abs(sim.netImpact) < 1 ? 'neutral' : rising ? 'amber' : 'emerald'} />
      </div>

      {/* Split bar: how much of the bill move the hedge absorbs */}
      <div className="mt-3">
        <div className="flex h-2 w-full overflow-hidden rounded-full bg-neutral-800">
          <div className="h-full bg-emerald-500/80" style={{ width: `${hedgeW}%` }} />
          <div className="h-full bg-rose-500/70" style={{ width: `${netW}%` }} />
        </div>
        <div className="mt-1 flex justify-between text-[11px] text-neutral-500">
          <span className="text-emerald-400/80">hedge absorbs {pct(hedgeRatio)}</span>
          <span className="text-rose-400/80">you carry {pct(1 - hedgeRatio)}</span>
        </div>
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-neutral-500">
        {rising
          ? `When H100 rent spikes, the long hedge pays ${usd(sim.hedgePnl)} back — you only absorb ${usd(Math.abs(sim.netImpact))} of a ${usd(sim.billDelta)} increase.`
          : delta < 0
            ? `If H100 rent falls, your bill drops ${usd(Math.abs(sim.billDelta))}; the hedge gives back ${usd(Math.abs(sim.hedgePnl))}, so you keep ${usd(Math.abs(sim.netImpact))}.`
            : `Drag the slider to see how a move in the H100 rental rate hits your bill versus the hedge.`}
      </p>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  subTone = 'neutral',
  valueTone = 'neutral',
}: {
  label: string;
  value: string;
  sub?: string;
  subTone?: 'neutral' | 'red' | 'emerald' | 'amber';
  valueTone?: 'neutral' | 'red' | 'emerald' | 'amber';
}) {
  const tone = (t: string) =>
    t === 'red' ? 'text-rose-400' : t === 'emerald' ? 'text-emerald-300' : t === 'amber' ? 'text-amber-300' : 'text-neutral-100';
  return (
    <div className="rounded-lg border border-neutral-800/70 bg-neutral-950/40 p-2">
      <div className="text-[11px] text-neutral-500">{label}</div>
      <div className={`tnum text-sm font-medium ${tone(valueTone)}`}>{value}</div>
      {sub ? <div className={`tnum text-[11px] ${tone(subTone)}`}>{sub}</div> : null}
    </div>
  );
}
