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
    <div className="rounded-[15px] border border-[rgba(125,211,252,0.25)] bg-[rgba(125,211,252,0.04)] p-[17px]">
      <div className="mb-[9px] flex items-baseline justify-between gap-[10px]">
        <span className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-sky">Agent self-payment · x402</span>
        <span className="font-mono text-[10.5px] text-mut3">it pays its own way</span>
      </div>
      <p className="mb-[14px] text-[13px] leading-[1.55] text-mut">
        Compation pays a tiny USDC micropayment for the live Injective market data it uses — settled on-chain via x402
        (EIP-3009, gasless for the agent).
      </p>

      {(state === 'idle' || state === 'error') && (
        <button
          onClick={pay}
          disabled={false}
          className="w-full rounded-[11px] bg-sky px-3 py-[11px] font-sans text-[13.5px] font-semibold text-ink transition disabled:opacity-50"
        >
          Pay $0.01 USDC for live market data
        </button>
      )}
      {state === 'paying' && (
        <button disabled className="w-full rounded-[11px] bg-sky px-3 py-[11px] font-sans text-[13.5px] font-semibold text-ink opacity-50">
          signing + settling on-chain…
        </button>
      )}

      {state === 'error' && (
        <div className="mt-3 font-mono text-[11.5px] text-rose">x402 failed: {receipt?.error ?? 'unknown error'}</div>
      )}

      {state === 'submitted' && receipt && (
        <div className="mt-3 space-y-2 border-t border-[rgba(255,255,255,0.07)] pt-3 font-mono text-[11.5px]">
          <div className="flex items-center justify-between">
            <span className="text-gold">● Submitted · confirmation lagged</span>
            <span className="tnum text-gold">~{(receipt.latencyMs / 1000).toFixed(1)}s</span>
          </div>
          <p className="text-[11px] leading-relaxed text-mut3">
            The payment was submitted on-chain but settlement confirmation didn&apos;t return in time. Verify on the
            explorer before paying again.
          </p>
          {receipt.txHash && (
            <div className="flex items-center gap-2">
              <a
                href={receipt.explorerUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-gold no-underline hover:text-gold/80"
              >
                <span>{shortHash(receipt.txHash)}</span>
                <span>verify settlement ↗</span>
              </a>
              <CopyButton value={receipt.txHash} />
            </div>
          )}
        </div>
      )}

      {state === 'done' && receipt && (
        <div className="mt-3 space-y-[7px] border-t border-[rgba(255,255,255,0.07)] pt-3 font-mono text-[11.5px]">
          <div className="flex items-center justify-between">
            <span className="text-sky">● Paid {usd(receipt.amountUsdc)} USDC</span>
            <span className="tnum text-sky">~{(receipt.latencyMs / 1000).toFixed(1)}s · settled</span>
          </div>
          <div className="flex justify-between gap-[12px]">
            <span className="text-mut2">network</span>
            <span className="tnum text-paper">{receipt.network}</span>
          </div>
          <div className="flex justify-between gap-[12px]">
            <span className="text-mut2">received</span>
            <span className="text-paper">{receipt.dataPreview}</span>
          </div>
          {receipt.txHash && (
            <div className="flex items-center justify-between gap-[12px]">
              <span className="text-mut2">receipt</span>
              <div className="flex items-center gap-2">
                <a
                  href={receipt.explorerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-sky no-underline hover:text-sky/80"
                >
                  <span>{shortHash(receipt.txHash)}</span>
                  <span>view settlement ↗</span>
                </a>
                <CopyButton value={receipt.txHash} />
              </div>
            </div>
          )}
          <button onClick={() => { setState('idle'); setReceipt(null); }} className="text-mut3 hover:text-paper">
            pay again
          </button>
        </div>
      )}
    </div>
  );
}
