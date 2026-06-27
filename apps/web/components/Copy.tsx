'use client';

import { useState } from 'react';

/** A tiny inline copy-to-clipboard button for hashes and addresses. */
export function CopyButton({ value, className }: { value: string; className?: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'error'>('idle');
  return (
    <button
      type="button"
      aria-label="Copy to clipboard"
      title={state === 'copied' ? 'Copied' : state === 'error' ? 'Copy failed' : 'Copy'}
      onClick={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        try {
          if (!navigator.clipboard) throw new Error('clipboard unavailable');
          await navigator.clipboard.writeText(value);
          setState('copied');
        } catch {
          setState('error');
        }
        setTimeout(() => setState('idle'), 1200);
      }}
      className={`tnum text-[11px] leading-none text-neutral-500 transition hover:text-neutral-200 ${className ?? ''}`}
    >
      {state === 'copied' ? '✓ copied' : state === 'error' ? '⚠ failed' : '⧉ copy'}
    </button>
  );
}
