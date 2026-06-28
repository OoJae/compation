import type { ComputeOutput, PlaceOutput } from './types';
import { usd, num, pct, shortHash } from './format';
import { CopyButton } from './Copy';

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-mut2">{label}</span>
      <span className={`tnum ${accent ? 'text-teal' : 'text-paper'}`}>{value}</span>
    </div>
  );
}

export function HedgeConfirmation({ compute, place }: { compute: ComputeOutput; place?: PlaceOutput }) {
  if (compute.ok === false) {
    const errs = compute.errors ?? [];
    return (
      <div className="rounded-[15px] border border-[rgba(251,113,133,0.25)] bg-[rgba(251,113,133,0.05)] p-[17px]">
        <div className="font-sans text-sm font-semibold text-rose">Hedge not placed</div>
        {errs.length > 0 ? (
          <ul className="mt-2 space-y-1 font-mono text-[11.5px] text-rose/80">
            {errs.map((e, i) => (
              <li key={i}>
                <span className="text-rose">{e.code}</span> — {e.message}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 font-mono text-[11.5px] leading-relaxed text-rose/80">
            {compute.error ?? 'The hedge could not be computed right now. Please retry.'}
          </p>
        )}
      </div>
    );
  }

  const h = compute.h100;
  const e = compute.execution;

  return (
    <div className="flex flex-col gap-3">
      {/* H100 economics — front and center */}
      <div className="rounded-[15px] border border-[rgba(52,211,153,0.22)] bg-[linear-gradient(180deg,rgba(52,211,153,0.05),rgba(52,211,153,0))] p-[17px]">
        <div className="mb-1.5 flex items-center justify-between gap-2.5">
          <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-teal">H100 compute hedge</span>
          <span className="font-mono text-[11px] text-mut2">
            index <b className="tnum font-normal text-teal">{usd(h.indexPrice)}</b>/hr
          </span>
        </div>
        <div className="tnum font-display text-[clamp(2.2rem,4vw,2.9rem)] font-bold leading-none tracking-[-0.02em] text-paper">
          {usd(h.notional)}
        </div>
        <div className="mt-[11px] flex flex-wrap items-baseline justify-between gap-1.5">
          <span className="font-mono text-[11.5px] text-mut2">
            hedged notional · {num(h.hedgeSize)} H100-h · ratio {pct(h.hedgeRatio)}
          </span>
          <span className="font-mono text-[11.5px] text-mut2">
            exposure <b className="tnum font-normal text-[#C4C9D1]">{num(h.exposureHours, 0)} H100-h/mo</b>
          </span>
        </div>
      </div>

      {/* Execution on the proxy venue */}
      {e && (
        <div className="rounded-[15px] border border-[rgba(255,255,255,0.08)] bg-[linear-gradient(180deg,rgba(255,255,255,0.016),rgba(255,255,255,0))] p-[17px]">
          <div className="mb-[13px] font-mono text-[10.5px] uppercase tracking-[0.14em] text-mut3">
            Execution · {compute.venueTicker}
          </div>
          <div className="flex flex-col gap-2.5 font-mono text-[12.5px]">
            <Row label="venue price" value={usd(e.venuePrice)} />
            <Row label="size" value={`${num(e.size)} contracts`} />
            <Row label="notional" value={usd(e.notional)} />
            <Row label="margin (USDC)" value={usd(e.margin)} />
            <Row label="leverage" value={`${num(e.leverage)}×`} />
            <Row label="est. liquidation" value={usd(e.estLiquidationPrice)} />
            <Row label="liq. buffer" value={pct(e.liquidationBufferPct)} accent />
            <Row label="est. slippage" value={pct(e.estSlippagePct)} />
          </div>
        </div>
      )}

      {compute.warnings.length > 0 && (
        <div className="rounded-[15px] border border-[rgba(245,181,68,0.25)] bg-[rgba(245,181,68,0.04)] px-[17px] py-3 font-mono text-[11.5px] text-gold">
          {compute.warnings.map((w, i) => (
            <div key={i}>⚠ {w.message}</div>
          ))}
        </div>
      )}

      {place?.ok && place.txHash && (
        <div className="rounded-[15px] border border-[rgba(52,211,153,0.22)] bg-[rgba(52,211,153,0.04)] px-[17px] py-[15px]">
          <div className="flex items-center justify-between gap-2.5">
            <span className="inline-flex items-center gap-2">
              <span className="live-dot" />
              <span className="font-sans text-[13px] font-medium text-paper">Position opened on-chain</span>
            </span>
            <span className="tnum text-right font-mono text-[11.5px] text-mut2">
              long {num(place.size)} · {usd(place.notional)}
            </span>
          </div>
          <div className="mt-3 flex items-center gap-2.5 border-t border-[rgba(255,255,255,0.07)] pt-3 font-mono text-[12px]">
            <a
              href={place.explorerUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2.5"
            >
              <span className="text-[#BBF3DD]">{shortHash(place.txHash)}</span>
              <span className="text-teal">view on explorer ↗</span>
            </a>
            <CopyButton value={place.txHash} />
          </div>
        </div>
      )}

      {place?.ok && !place.txHash && place.unconfirmed && (
        <div className="rounded-[15px] border border-[rgba(245,181,68,0.25)] bg-[rgba(245,181,68,0.04)] p-[17px] font-mono text-[11.5px] text-gold">
          <div className="font-sans text-[13px] font-semibold text-gold">● Position open · confirmation lagged</div>
          <p className="mt-1 leading-relaxed">
            {place.note ?? 'The order is on-chain; settlement confirmation was delayed. Verify it in your positions.'}
          </p>
        </div>
      )}

      {place && place.ok === false && (
        <div className="rounded-[15px] border border-[rgba(251,113,133,0.25)] bg-[rgba(251,113,133,0.05)] px-[17px] py-3 font-mono text-[11.5px] text-rose">
          {place.code === 'SUBMITTED_UNCONFIRMED' ? place.error : `Execution failed: ${place.error}`}
        </div>
      )}
    </div>
  );
}
