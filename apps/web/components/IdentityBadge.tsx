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
      <span className="text-mut2">{label}</span>
      <span className="flex items-baseline gap-2 text-right">
        <span className={`${mono ? 'font-mono tnum' : 'font-mono'} ${tone === 'emerald' ? 'text-teal' : 'text-[#C4C9D1]'}`}>
          {value}
        </span>
        {copyValue && <CopyButton value={copyValue} />}
      </span>
    </div>
  );
}

export function IdentityBadge({ identity }: { identity: AgentIdentity }) {
  return (
    <div className="rounded-[15px] border border-[rgba(255,255,255,0.08)] bg-[linear-gradient(180deg,rgba(255,255,255,0.016),rgba(255,255,255,0))] p-[17px]">
      <div className="mb-[14px] flex items-baseline justify-between gap-[10px]">
        <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-teal">On-chain identity &amp; economics</span>
        <span className="font-mono text-[10px] text-mut3">a registered economic actor</span>
      </div>
      <div className="flex flex-col gap-[11px] font-mono text-[12px]">
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
          className="mt-[13px] inline-block font-mono text-[11.5px] text-teal hover:underline"
        >
          identity registration tx ↗
        </a>
      )}
      <p className="mt-[13px] text-[12px] leading-[1.5] text-mut2">
        Compation is the <span className="font-mono">feeRecipient</span> on every order it signs — the Injective relayer
        fee-share accrues to the agent, not a middleman. The seed of a built-in, on-chain business model.
      </p>
    </div>
  );
}
