import type { AgentMeta } from './types';

export function ProxyBadge({ meta, liveVenue }: { meta: AgentMeta; liveVenue?: string }) {
  if (!meta.proxy) return null;
  const venue = liveVenue ?? meta.venueTicker;
  return (
    <div className="flex items-start gap-[10px] rounded-[13px] border border-[rgba(245,181,68,0.25)] bg-[rgba(245,181,68,0.04)] px-[15px] py-[13px]">
      <span className="mt-[4px] h-[7px] w-[7px] flex-none rounded-full bg-gold shadow-[0_0_8px_rgba(245,181,68,0.6)]" />
      <p className="m-0 text-[12.5px] leading-[1.5] text-[#C9B68C]">
        <span className="font-medium text-gold">Native H100 perp paused</span>
        <span className="text-[#C9B68C]/60"> → </span>
        executing on <span className="font-medium text-[#F5D9A0]">{venue}</span> proxy
        {meta.fallbackTicker ? <span className="text-[#C9B68C]/70"> (fallback {meta.fallbackTicker})</span> : null}
        <span className="text-[#C9B68C]/60"> → </span>
        auto-routes to native H100 on relist.
      </p>
    </div>
  );
}
