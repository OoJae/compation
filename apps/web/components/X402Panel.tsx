'use client';

import { useState } from 'react';
import { usd, shortHash } from './format';
import { CopyButton } from './Copy';

interface X402Receipt {
  ok: boolean;
  endpoint: string;
  amountUsdc: number;
  network: string;
  latencyMs: number;
  txHash?: string;
  explorerUrl?: string;
  payer?: string;
  dataPreview?: string;
  error?: string;
}

export function X402Panel() {
  const [state, setState] = useState<'idle' | 'paying' | 'done' | 'submitted' | 'error'>('idle');
  const [receipt, setReceipt] = useState<X402Receipt | null>(null);

  async function pay() {
    setState('paying');
    try {
      const r = await fetch('/api/x402', { method: 'POST' });
      const j = (await r.json()) as X402Receipt;
      setReceipt(j);
      // A txHash with !ok = settled on-chain but confirmation flaked — not a failure,
      // and we must NOT invite an immediate re-pay (that would double-spend).
      setState(j.ok ? 'done' : j.txHash ? 'submitted' : 'error');
    } catch {
      setState('error');
    }
  }

  return (
    <div className="rounded-xl border border-sky-900/40 bg-sky-950/10 p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-sky-300">Agent self-payment · x402</span>
        <span className="text-[11px] text-neutral-500">it pays its own way</span>
      </div>
      <p className="mb-3 text-xs leading-relaxed text-neutral-400">
        Compation pays a tiny USDC micropayment for the live Injective market data it uses — settled on-chain via x402
        (EIP-3009, gasless for the agent).
      </p>

      {(state === 'idle' || state === 'error') && (
        <button
          onClick={pay}
          disabled={false}
          className="w-full rounded-lg bg-sky-500 px-3 py-2 text-sm font-medium text-sky-950 transition disabled:opacity-50"
        >
          Pay $0.01 USDC for live market data
        </button>
      )}
      {state === 'paying' && (
        <button disabled className="w-full rounded-lg bg-sky-500 px-3 py-2 text-sm font-medium text-sky-950 opacity-50">
          signing + settling on-chain…
        </button>
      )}

      {state === 'error' && (
        <div className="mt-2 text-xs text-rose-400">x402 failed: {receipt?.error ?? 'unknown error'}</div>
      )}

      {state === 'submitted' && receipt && (
        <div className="space-y-2">
          <div className="flex items-center justify-between rounded-lg border border-amber-900/40 bg-amber-950/20 px-3 py-2">
            <span className="text-sm font-medium text-amber-200">● Submitted · confirmation lagged</span>
            <span className="tnum text-[11px] text-neutral-400">~{(receipt.latencyMs / 1000).toFixed(1)}s</span>
          </div>
          <p className="text-[11px] leading-relaxed text-neutral-500">
            The payment was submitted on-chain but settlement confirmation didn&apos;t return in time. Verify on the
            explorer before paying again.
          </p>
          {receipt.txHash && (
            <div className="flex items-center gap-2">
              <a
                href={receipt.explorerUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-amber-800/50 bg-amber-900/20 px-3 py-1.5 text-xs text-amber-200 hover:bg-amber-900/40"
              >
                <span className="font-mono">{shortHash(receipt.txHash)}</span>
                <span className="text-amber-400">verify settlement ↗</span>
              </a>
              <CopyButton value={receipt.txHash} />
            </div>
          )}
        </div>
      )}

      {state === 'done' && receipt && (
        <div className="space-y-2">
          <div className="flex items-center justify-between rounded-lg border border-sky-900/40 bg-sky-950/20 px-3 py-2">
            <span className="text-sm font-medium text-sky-200">● Paid {usd(receipt.amountUsdc)} USDC</span>
            <span className="tnum text-[11px] text-neutral-400">~{(receipt.latencyMs / 1000).toFixed(1)}s · settled</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px] text-neutral-500">
            <div>
              network <span className="tnum text-neutral-300">{receipt.network}</span>
            </div>
            <div>
              received <span className="text-neutral-300">{receipt.dataPreview}</span>
            </div>
          </div>
          {receipt.txHash && (
            <div className="flex items-center gap-2">
              <a
                href={receipt.explorerUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-sky-800/50 bg-sky-900/20 px-3 py-1.5 text-xs text-sky-200 hover:bg-sky-900/40"
              >
                <span className="font-mono">{shortHash(receipt.txHash)}</span>
                <span className="text-sky-400">view settlement ↗</span>
              </a>
              <CopyButton value={receipt.txHash} />
            </div>
          )}
          <button onClick={() => { setState('idle'); setReceipt(null); }} className="text-[11px] text-neutral-500 hover:text-neutral-300">
            pay again
          </button>
        </div>
      )}
    </div>
  );
}
