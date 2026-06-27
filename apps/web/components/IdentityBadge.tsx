import type { AgentIdentity } from './types';
import { CopyButton } from './Copy';

const short = (a?: string) => (a ? `${a.slice(0, 10)}…${a.slice(-6)}` : '—');

function Row({
  label,
  value,
  mono,
  tone,
  copyValue,
}: {
  label: string;
  value: string;
  mono?: boolean;
  tone?: 'emerald';
  copyValue?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-neutral-500">{label}</span>
      <span className="flex items-baseline gap-2 text-right">
        <span className={`${mono ? 'font-mono' : ''} ${tone === 'emerald' ? 'text-emerald-300' : 'text-neutral-200'}`}>
          {value}
        </span>
        {copyValue && <CopyButton value={copyValue} />}
      </span>
    </div>
  );
}

export function IdentityBadge({ identity }: { identity: AgentIdentity }) {
  return (
    <div className="rounded-xl border border-emerald-900/40 bg-emerald-950/10 p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-emerald-300">On-chain identity & economics</span>
        <span className="text-[11px] text-neutral-500">a registered economic actor</span>
      </div>
      <div className="space-y-1.5 text-xs">
        <Row label="agent (inj)" value={short(identity.injAddress)} mono copyValue={identity.injAddress} />
        <Row label="agent (evm)" value={short(identity.evmAddress)} mono copyValue={identity.evmAddress} />
        <Row label="fee recipient" value="its own — no relayer skim" tone="emerald" />
        {identity.erc8004TokenId ? (
          <Row label="ERC-8004" value={`registered · #${identity.erc8004TokenId}`} tone="emerald" />
        ) : (
          <Row label="ERC-8004 registry" value={short(identity.erc8004Registry)} mono />
        )}
      </div>
      {identity.erc8004ExplorerUrl && (
        <a
          href={identity.erc8004ExplorerUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-block text-[11px] text-emerald-400 hover:underline"
        >
          identity registration tx ↗
        </a>
      )}
      <p className="mt-2 text-[11px] leading-relaxed text-neutral-500">
        Compation is the <span className="font-mono">feeRecipient</span> on every order it signs — the Injective relayer
        fee-share accrues to the agent, not a middleman. The seed of a built-in, on-chain business model.
      </p>
    </div>
  );
}
