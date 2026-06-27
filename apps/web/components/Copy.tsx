'use client';

import { useState } from 'react';

/** A tiny inline copy-to-clipboard button for hashes and addresses. */
export function CopyButton({ value, className }: { value: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      aria-label="Copy to clipboard"
      title={copied ? 'Copied' : 'Copy'}
      onClick={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        } catch {
          /* clipboard unavailable — no-op */
        }
      }}
      className={`tnum text-[11px] leading-none text-neutral-500 transition hover:text-neutral-200 ${className ?? ''}`}
    >
      {copied ? '✓ copied' : '⧉ copy'}
    </button>
  );
}
