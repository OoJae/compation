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
    <div className="border border-[rgba(255,255,255,0.08)] rounded-[15px] bg-[linear-gradient(180deg,rgba(255,255,255,0.016),rgba(255,255,255,0))] p-[17px]">
      <div className="mb-1.5 flex items-center justify-between gap-2.5">
        <span className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-mut3">Live hedge dashboard</span>
        <span className="font-mono text-[11px] text-mut2">
          <span className="mr-[5px] inline-block h-1.5 w-1.5 rounded-full bg-teal align-middle live-dot" />
          H100 index{' '}
          <b className="tnum text-teal font-bold">{usd(displayIndex)}/hr</b>
        </span>
      </div>

      <p className="mb-4 text-[12.5px] leading-[1.5] text-mut2">
        Monthly compute bill <b className="tnum text-paper">{usd(monthlyBill)}</b> · hedged{' '}
        <b className="tnum text-paper">{pct(hedgeRatio)}</b> on H100
      </p>

      {/* What-if slider */}
      <div className="mb-1">
        <div className="mb-[9px] flex items-baseline justify-between gap-2.5">
          <span className="font-mono text-[11px] tracking-[0.06em] uppercase text-mut2">If the H100 rate moves</span>
          <span className="tnum font-display text-[1.2rem] font-bold text-gold">
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
          className="wf w-full cursor-pointer"
          style={{ ['--p' as string]: `${((pct100 + 50) / 100) * 100}%` }}
        />
        <div className="mt-[13px] flex flex-wrap gap-[7px]">
          {PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => setPct100(p)}
              aria-pressed={pct100 === p}
              className={`cursor-pointer rounded-[8px] border px-[11px] py-[6px] font-mono text-[11px] ${
                pct100 === p
                  ? 'border-[rgba(52,211,153,0.4)] bg-[rgba(52,211,153,0.1)] text-teal'
                  : 'border-[rgba(255,255,255,0.12)] bg-transparent text-mut hover:text-paper'
              }`}
            >
              {p > 0 ? '+' : ''}
              {p}%
            </button>
          ))}
        </div>
      </div>

      {/* Outcome */}
      <div className="mt-4 grid grid-cols-3 gap-[9px]">
        <Stat label="Compute bill" value={usd(sim.newBill)} sub={`${rising ? '+' : ''}${usd(sim.billDelta)}`} subTone={rising ? 'red' : 'emerald'} />
        <Stat label="Hedge P&L" value={`${sim.hedgePnl >= 0 ? '+' : ''}${usd(sim.hedgePnl)}`} subTone="neutral" sub="long H100" valueTone={sim.hedgePnl >= 0 ? 'emerald' : 'red'} />
        <Stat
          label="Net impact"
          value={`${sim.netImpact >= 0 ? '+' : ''}${usd(sim.netImpact)}`}
          sub={`${pct(hedgeRatio)} protected`}
          subTone="emerald"
          accent
          valueTone={Math.abs(sim.netImpact) < 1 ? 'neutral' : rising ? 'amber' : 'emerald'}
        />
      </div>

      {/* Split bar: how much of the bill move the hedge absorbs */}
      <div className="mt-[15px]">
        <div className="flex h-[7px] w-full overflow-hidden rounded-[999px] bg-[rgba(255,255,255,0.05)]">
          <div className="h-full bg-[linear-gradient(90deg,#34D399,#2BB389)]" style={{ width: `${hedgeW}%` }} />
          <div className="h-full bg-[rgba(245,181,68,0.5)]" style={{ width: `${netW}%` }} />
        </div>
        <div className="mt-2 flex justify-between font-mono text-[10.5px]">
          <span className="text-teal">hedge absorbs <b>{pct(hedgeRatio)}</b></span>
          <span className="text-gold">you carry <b>{pct(1 - hedgeRatio)}</b></span>
        </div>
      </div>

      <p className="mt-[13px] text-[12px] leading-[1.5] text-mut2">
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
  accent = false,
}: {
  label: string;
  value: string;
  sub?: string;
  subTone?: 'neutral' | 'red' | 'emerald' | 'amber';
  valueTone?: 'neutral' | 'red' | 'emerald' | 'amber';
  accent?: boolean;
}) {
  const tone = (t: string) =>
    t === 'red' ? 'text-rose' : t === 'emerald' ? 'text-teal' : t === 'amber' ? 'text-gold' : 'text-paper';
  return (
    <div
      className={`rounded-[11px] border p-[12px_11px] ${
        accent ? 'border-[rgba(52,211,153,0.25)] bg-[rgba(52,211,153,0.04)]' : 'border-[rgba(255,255,255,0.08)]'
      }`}
    >
      <div className="mb-[7px] font-mono text-[9.5px] tracking-[0.08em] uppercase text-mut2">{label}</div>
      <div className={`tnum font-display text-[1.15rem] font-bold ${tone(valueTone)}`}>{value}</div>
      {sub ? <div className={`tnum mt-[3px] font-mono text-[11px] ${tone(subTone)}`}>{sub}</div> : null}
    </div>
  );
}
