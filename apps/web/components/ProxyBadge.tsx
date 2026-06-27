import type { AgentMeta } from './types';

export function ProxyBadge({ meta, liveVenue }: { meta: AgentMeta; liveVenue?: string }) {
  if (!meta.proxy) return null;
  const venue = liveVenue ?? meta.venueTicker;
  return (
    <div className="rounded-lg border border-amber-800/40 bg-amber-950/20 px-3 py-2 text-xs leading-relaxed text-amber-200/90">
      <span className="font-medium">Native H100 perp paused</span>
      <span className="text-amber-200/50"> → </span>
      executing on <span className="font-medium">{venue}</span> proxy
      {meta.fallbackTicker ? <span className="text-amber-200/60"> (fallback {meta.fallbackTicker})</span> : null}
      <span className="text-amber-200/50"> → </span>
      auto-routes to native H100 on relist.
    </div>
  );
}
