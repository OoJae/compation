import type { ComputeOutput, PlaceOutput } from './types';
import { usd, num, pct, shortHash } from './format';
import { CopyButton } from './Copy';

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1">
      <span className="text-xs text-neutral-500">{label}</span>
      <span className={`tnum text-sm ${accent ? 'text-emerald-300' : 'text-neutral-100'}`}>{value}</span>
    </div>
  );
}

export function HedgeConfirmation({ compute, place }: { compute: ComputeOutput; place?: PlaceOutput }) {
  if (compute.ok === false) {
    const errs = compute.errors ?? [];
    return (
      <div className="rounded-xl border border-red-900/50 bg-red-950/20 p-4">
        <div className="text-sm font-medium text-red-300">Hedge not placed</div>
        {errs.length > 0 ? (
          <ul className="mt-2 space-y-1 text-xs text-red-200/80">
            {errs.map((e, i) => (
              <li key={i}>
                <span className="font-mono text-red-300">{e.code}</span> — {e.message}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-xs text-red-200/80">
            {compute.error ?? 'The hedge could not be computed right now. Please retry.'}
          </p>
        )}
      </div>
    );
  }

  const h = compute.h100;
  const e = compute.execution;

  return (
    <div className="overflow-hidden rounded-xl border border-emerald-900/40 bg-gradient-to-b from-emerald-950/20 to-neutral-900/30">
      {/* H100 economics — front and center */}
      <div className="border-b border-neutral-800/70 p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wider text-emerald-400">H100 compute hedge</span>
          <span className="tnum text-xs text-neutral-500">index {usd(h.indexPrice)}/hr</span>
        </div>
        <div className="flex items-end justify-between">
          <div>
            <div className="tnum text-2xl font-semibold text-neutral-50">{usd(h.notional)}</div>
            <div className="text-xs text-neutral-500">
              hedged notional · {num(h.hedgeSize)} H100-h · ratio {pct(h.hedgeRatio)}
            </div>
          </div>
          <div className="text-right text-xs text-neutral-500">
            <div>exposure</div>
            <div className="tnum text-neutral-300">{num(h.exposureHours, 0)} H100-h/mo</div>
          </div>
        </div>
      </div>

      {/* Execution on the proxy venue */}
      {e && (
        <div className="p-4">
          <div className="mb-1 text-xs font-medium uppercase tracking-wider text-neutral-500">
            Execution · {compute.venueTicker}
          </div>
          <Row label="venue price" value={usd(e.venuePrice)} />
          <Row label="size" value={`${num(e.size)} contracts`} />
          <Row label="notional" value={usd(e.notional)} />
          <Row label="margin (USDC)" value={usd(e.margin)} />
          <Row label="leverage" value={`${num(e.leverage)}×`} />
          <Row label="est. liquidation" value={usd(e.estLiquidationPrice)} />
          <Row label="liq. buffer" value={pct(e.liquidationBufferPct)} accent />
          <Row label="est. slippage" value={pct(e.estSlippagePct)} />
        </div>
      )}

      {compute.warnings.length > 0 && (
        <div className="border-t border-neutral-800/70 px-4 py-2 text-xs text-amber-300/80">
          {compute.warnings.map((w, i) => (
            <div key={i}>⚠ {w.message}</div>
          ))}
        </div>
      )}

      {place?.ok && place.txHash && (
        <div className="border-t border-emerald-900/40 bg-emerald-950/30 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-emerald-300">● Position opened on-chain</span>
            <span className="tnum text-xs text-neutral-400">
              long {num(place.size)} · {usd(place.notional)}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <a
              href={place.explorerUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-emerald-800/50 bg-emerald-900/20 px-3 py-1.5 text-xs text-emerald-200 hover:bg-emerald-900/40"
            >
              <span className="font-mono">{shortHash(place.txHash)}</span>
              <span className="text-emerald-400">view on explorer ↗</span>
            </a>
            <CopyButton value={place.txHash} />
          </div>
        </div>
      )}

      {place?.ok && !place.txHash && place.unconfirmed && (
        <div className="border-t border-amber-900/40 bg-amber-950/20 p-4 text-xs text-amber-200">
          <div className="text-sm font-medium text-amber-300">● Position open · confirmation lagged</div>
          <p className="mt-1 leading-relaxed">
            {place.note ?? 'The order is on-chain; settlement confirmation was delayed. Verify it in your positions.'}
          </p>
        </div>
      )}

      {place && place.ok === false && (
        <div className="border-t border-red-900/40 bg-red-950/20 p-3 text-xs text-red-300">
          {place.code === 'SUBMITTED_UNCONFIRMED' ? place.error : `Execution failed: ${place.error}`}
        </div>
      )}
    </div>
  );
}
