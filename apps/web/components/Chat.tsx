'use client';

import { useState, type ReactNode } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import type { AgentMeta, AnyPart, ComputeOutput, PlaceOutput } from './types';
import { DecisionTrail } from './DecisionTrail';
import { HedgeConfirmation } from './HedgeConfirmation';
import { ProxyBadge } from './ProxyBadge';

const EXAMPLE = 'I spend about $40,000/month renting H100 GPUs for my AI startup — hedge most of it.';

function toolOutput(parts: AnyPart[], name: string): unknown {
  return parts.find((p) => p.type === `tool-${name}` && p.state === 'output-available')?.output;
}
const textOf = (parts: AnyPart[]) => parts.filter((p) => p.type === 'text').map((p) => p.text ?? '').join('');
const reasoningOf = (parts: AnyPart[]) =>
  parts.filter((p) => p.type === 'reasoning').map((p) => p.text ?? '').join('');

export function Chat({ meta }: { meta: AgentMeta }) {
  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({ api: '/api/chat' }),
  });
  const [input, setInput] = useState('');
  const busy = status === 'submitted' || status === 'streaming';

  const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant');
  const toolParts = ((lastAssistant?.parts ?? []) as unknown as AnyPart[]).filter(
    (p) => typeof p.type === 'string' && p.type.startsWith('tool-'),
  );
  const compute = toolOutput(toolParts, 'compute_hedge') as ComputeOutput | undefined;
  const place = toolOutput(toolParts, 'place_hedge') as PlaceOutput | undefined;

  function submit(text: string) {
    const t = text.trim();
    if (!t || busy) return;
    sendMessage({ text: t });
    setInput('');
  }

  return (
    <main className="mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 gap-5 px-5 py-6 lg:grid-cols-[1fr_minmax(330px,430px)]">
      {/* LEFT — conversation */}
      <section className="flex min-h-[62vh] flex-col">
        <div className="flex-1 space-y-4 overflow-y-auto pr-1">
          {messages.length === 0 && <Empty onPick={() => submit(EXAMPLE)} example={EXAMPLE} />}
          {messages.map((m) => {
            const mp = (m.parts ?? []) as unknown as AnyPart[];
            if (m.role === 'user') {
              return (
                <Bubble key={m.id} side="right">
                  {textOf(mp)}
                </Bubble>
              );
            }
            const reasoning = reasoningOf(mp);
            const text = textOf(mp);
            return (
              <div key={m.id} className="space-y-2">
                {reasoning && (
                  <div className="rounded-lg border border-neutral-800/60 bg-neutral-900/30 px-3 py-2 text-xs italic text-neutral-500">
                    {reasoning}
                  </div>
                )}
                {text && <Bubble side="left">{text}</Bubble>}
              </div>
            );
          })}
          {busy && !lastAssistant && <div className="animate-pulse text-sm text-neutral-500">Reasoning…</div>}
        </div>

        <form onSubmit={(ev) => { ev.preventDefault(); submit(input); }} className="mt-4 flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submit(input);
              }
            }}
            rows={2}
            placeholder="Describe your H100 compute spend…"
            className="min-h-[46px] flex-1 resize-none rounded-xl border border-neutral-800 bg-neutral-900/60 px-3 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-600 focus:border-emerald-700/60 focus:outline-none"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            className="h-[46px] rounded-xl bg-emerald-500 px-5 text-sm font-medium text-emerald-950 transition disabled:opacity-40"
          >
            {busy ? '…' : 'Hedge'}
          </button>
        </form>
        {error && <div className="mt-2 text-xs text-red-400">{error.message}</div>}
      </section>

      {/* RIGHT — live agent state */}
      <aside className="space-y-4">
        <ProxyBadge meta={meta} liveVenue={compute?.venueTicker} />
        <DecisionTrail toolParts={toolParts} />
        {compute && <HedgeConfirmation compute={compute} place={place} />}
        {!compute && messages.length > 0 && busy && (
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4 text-xs text-neutral-500">
            Reading the live H100 index and computing the hedge…
          </div>
        )}
        {messages.length === 0 && <SidebarHint />}
      </aside>
    </main>
  );
}

function Bubble({ side, children }: { side: 'left' | 'right'; children: ReactNode }) {
  return (
    <div className={side === 'right' ? 'flex justify-end' : 'flex justify-start'}>
      <div
        className={`max-w-[88%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm ${
          side === 'right'
            ? 'border border-emerald-800/40 bg-emerald-500/10 text-emerald-50'
            : 'border border-neutral-800 bg-neutral-900/60 text-neutral-100'
        }`}
      >
        {children}
      </div>
    </div>
  );
}

function Empty({ onPick, example }: { onPick: () => void; example: string }) {
  return (
    <div className="flex h-full flex-col items-start justify-center gap-4 py-16">
      <h2 className="text-2xl font-medium tracking-tight text-neutral-100">Hedge your GPU compute in one sentence.</h2>
      <p className="max-w-md text-sm leading-relaxed text-neutral-500">
        Tell Compation your monthly H100 spend. It reads the live on-chain H100 rental-rate index, computes a precise
        hedge with a deterministic risk engine, and opens the position — showing every step.
      </p>
      <button
        onClick={onPick}
        className="rounded-lg border border-neutral-700 px-3.5 py-2.5 text-left text-sm text-neutral-300 transition hover:border-emerald-700/60 hover:text-emerald-200"
      >
        “{example}”
      </button>
    </div>
  );
}

function SidebarHint() {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4 text-xs leading-relaxed text-neutral-500">
      The decision trail (assess → compute → place → summarize) and a confirmation card with the H100 economics and the
      on-chain tx will appear here as the agent works.
    </div>
  );
}
