'use client';

import { useRef, useState, type ReactNode } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import type { AgentMeta, AgentIdentity, AnyPart, ComputeOutput, PlaceOutput } from './types';
import { DecisionTrail } from './DecisionTrail';
import { HedgeConfirmation } from './HedgeConfirmation';
import { HedgeDashboard } from './HedgeDashboard';
import { IdentityBadge } from './IdentityBadge';
import { ProxyBadge } from './ProxyBadge';
import { X402Panel } from './X402Panel';
import { Logo } from '@/components/Logo';

const EXAMPLE = 'I spend about $40,000/month renting H100 GPUs for my AI startup — hedge most of it.';

function toolOutput(parts: AnyPart[], name: string): unknown {
  return parts.find((p) => p.type === `tool-${name}` && p.state === 'output-available')?.output;
}
const textOf = (parts: AnyPart[]) => parts.filter((p) => p.type === 'text').map((p) => p.text ?? '').join('');
const reasoningOf = (parts: AnyPart[]) =>
  parts.filter((p) => p.type === 'reasoning').map((p) => p.text ?? '').join('');

export function Chat({ meta, identity }: { meta: AgentMeta; identity: AgentIdentity }) {
  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({ api: '/api/chat' }),
  });
  const [input, setInput] = useState('');
  const taRef = useRef<HTMLTextAreaElement>(null);
  const busy = status === 'submitted' || status === 'streaming';

  function autosize(el: HTMLTextAreaElement | null) {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }

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
    if (taRef.current) taRef.current.style.height = 'auto';
  }

  return (
    <main className="mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 gap-5 px-5 py-6 lg:grid-cols-[1fr_minmax(330px,430px)]">
      {/* LEFT — conversation */}
      <section className="flex min-h-[62vh] flex-col">
        <div className="flex-1 space-y-[18px] overflow-y-auto pr-1 pb-[18px]">
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
                  <div className="rounded-[11px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] px-3 py-2 font-serif text-xs italic text-mut3">
                    {reasoning}
                  </div>
                )}
                {text && <Bubble side="left">{text}</Bubble>}
              </div>
            );
          })}
          {busy && !lastAssistant && <Thinking />}
        </div>

        <div className="sticky bottom-[14px]">
          <form
            onSubmit={(ev) => { ev.preventDefault(); submit(input); }}
            className="flex items-end gap-[10px] rounded-[16px] border border-[rgba(255,255,255,0.12)] bg-[rgba(12,14,19,0.92)] py-[10px] pl-[16px] pr-[10px] backdrop-blur-[10px]"
          >
            <textarea
              ref={taRef}
              value={input}
              onChange={(e) => { setInput(e.target.value); autosize(e.target); }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  submit(input);
                }
              }}
              rows={1}
              placeholder="Describe your H100 compute spend…"
              className="max-h-[140px] min-h-[46px] flex-1 resize-none border-none bg-transparent py-2 font-sans text-[15px] leading-[1.5] text-paper placeholder:text-mut3 focus:outline-none"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="flex-none rounded-[11px] bg-teal px-5 py-[11px] font-sans text-[14.5px] font-semibold text-ink transition disabled:opacity-40"
            >
              {busy ? '…' : 'Hedge'}
            </button>
          </form>
        </div>
        {error && (
          <div className="mt-3 rounded-[11px] border border-[rgba(251,113,133,0.3)] bg-[rgba(251,113,133,0.06)] px-3 py-2.5 text-xs text-rose">
            {error.message || 'Something interrupted the agent. Please try again.'}
          </div>
        )}
      </section>

      {/* RIGHT — live agent state */}
      <aside className="space-y-3">
        <ProxyBadge meta={meta} liveVenue={compute?.venueTicker} />
        <DecisionTrail toolParts={toolParts} />
        {compute && <HedgeConfirmation compute={compute} place={place} />}
        {compute?.ok && <HedgeDashboard compute={compute} />}
        <X402Panel />
        <IdentityBadge identity={identity} />
        {!compute && messages.length > 0 && busy && (
          <div className="rounded-[15px] border border-[rgba(255,255,255,0.08)] bg-[linear-gradient(180deg,rgba(255,255,255,0.016),rgba(255,255,255,0))] p-[17px] font-mono text-[12.5px] text-mut">
            Reading the live H100 index and computing the hedge…
          </div>
        )}
        {messages.length === 0 && <SidebarHint />}
      </aside>
    </main>
  );
}

function Thinking() {
  return (
    <div className="flex items-center gap-3">
      <Logo size={30} />
      <div className="flex items-center gap-2 font-mono text-[13px] text-mut">
        <span>Reasoning</span>
        <span className="inline-flex gap-1">
          {['0ms', '150ms', '300ms'].map((d) => (
            <span
              key={d}
              className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-teal/70"
              style={{ animationDelay: d }}
            />
          ))}
        </span>
      </div>
    </div>
  );
}

function Bubble({ side, children }: { side: 'left' | 'right'; children: ReactNode }) {
  if (side === 'right') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[74%] whitespace-pre-wrap rounded-[16px_16px_4px_16px] border border-[rgba(52,211,153,0.18)] bg-[rgba(52,211,153,0.08)] px-4 py-[14px] text-[15px] leading-[1.5] text-[#E4E7EB]">
          {children}
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex-none">
        <Logo size={30} />
      </span>
      <div className="max-w-[88%] whitespace-pre-wrap rounded-[4px_16px_16px_16px] border border-[rgba(255,255,255,0.08)] bg-[linear-gradient(180deg,rgba(255,255,255,0.022),rgba(255,255,255,0))] px-5 py-[18px] text-[15px] leading-[1.6] text-[#C4C9D1]">
        {children}
      </div>
    </div>
  );
}

function Empty({ onPick, example }: { onPick: () => void; example: string }) {
  return (
    <div className="flex h-full flex-col items-start justify-center gap-4 py-16">
      <h2 className="font-display text-[1.9rem] font-bold tracking-[-0.02em] text-paper">Hedge your GPU compute in one sentence.</h2>
      <p className="max-w-md text-[15px] leading-relaxed text-mut">
        Tell Compation your monthly H100 spend. It reads the live on-chain H100 rental-rate index, computes a precise
        hedge with a deterministic risk engine, and opens the position — showing every step.
      </p>
      <button
        onClick={onPick}
        className="rounded-[11px] border border-[rgba(255,255,255,0.12)] px-3.5 py-2.5 text-left text-[14px] text-mut transition hover:border-[rgba(52,211,153,0.4)] hover:text-teal"
      >
        “{example}”
      </button>
    </div>
  );
}

function SidebarHint() {
  return (
    <div className="rounded-[15px] border border-[rgba(255,255,255,0.08)] bg-[linear-gradient(180deg,rgba(255,255,255,0.016),rgba(255,255,255,0))] p-[17px] text-[12.5px] leading-relaxed text-mut">
      The decision trail (assess → compute → place → summarize) and a confirmation card with the H100 economics and the
      on-chain tx will appear here as the agent works.
    </div>
  );
}
