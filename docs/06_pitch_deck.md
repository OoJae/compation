# Compation — Pitch Deck

> Drop each slide into your deck. One slide per `## Slide N` section.

---

## Slide 1 — Compation

**Headline:** An autonomous agent that hedges your AI compute costs on-chain — and pays for its own compute while it does.

- Compation: autonomous, on-chain hedging for AI compute
- "Azure brains, Injective hands, a wallet that pays its own way."
- Presenter: [name / @handle]
- Built for the Injective Nova / Rising Star Program

speaker note: Lead with the one-liner verbatim — it's the whole pitch in one sentence.

---

## Slide 2 — The Problem

**Headline:** GPU compute is every AI company's biggest, most volatile cost — and it's un-hedgeable.

- NVIDIA H100 rental rates are volatile and opaque, yet they're the dominant cost for training or serving AI
- A startup budgeting **$40,000/month** for H100s can watch that balloon when demand spikes or supply tightens
- Historically there has been **no financial instrument** to hedge it
- Founders eat the variance — there's no NVDA-for-compute they can short

speaker note: Make it visceral — the line item that wrecks the runway is the one with no hedge.

---

## Slide 3 — The Shift

**Headline:** Compute is becoming an asset class — and the first on-chain H100 market just went live.

- Injective put the **first on-chain NVIDIA H100 rental-rate market** live (Squaretower / Stork oracle)
- The H100 index reads **~$2.85 per H100-hour** (SQTWR_H100USD via Stork)
- Compute is being financialized industry-wide: **CME / Silicon Data**, **Messari 2026 Theses**
- The raw material for hedging compute now exists on-chain

speaker note: This is the "why now" setup — the market itself is brand new.

---

## Slide 4 — The Gap

**Headline:** The market exists. Founders still can't use it.

- A raw perpetual is unusable by a founder — sizing, collateral, subaccounts, signing, risk
- **No agent automates it** — hedging compute is still a trader-only action
- The H100 perp is even paused mid-migration (USDT → USDC collateral), so the index reads but the raw venue is fiddly
- Gap = a market with no on-ramp for the people who actually need it

speaker note: A market without an agent is a market only quants can touch.

---

## Slide 5 — Compation

**Headline:** Natural language in, a real on-chain hedge out — with three "wow" moments.

- **1. Live execution** — a real signed long opens on Injective; the confirmation card shows a real tx hash → click to the block explorer. *"That's a real position on Injective, right now."*
- **2. It pays for itself (x402)** — Compation pays an x402 endpoint **$0.01 USDC** for the data/inference it used; the panel shows the on-chain settlement tx, explorer link, and latency. *"The agent just paid for its own compute, on-chain."*
- **3. Real infrastructure (ERC-8004)** — Compation holds **identity NFT #49** in Injective's on-chain registry and is the **feeRecipient** on every fill. *"Not a demo — a registered economic actor with a built-in business model."*

speaker note: These are the three live beats of the demo — say them in this order.

---

## Slide 6 — How It Works

**Headline:** Azure brains, Injective hands, a wallet that pays its own way.

- **Azure brains** — Azure OpenAI `gpt-5.4-mini` (deployment `compation-gpt`) via @ai-sdk/azure: intent, strategy, plain-language narration
- **Injective hands** — Injective MCP Server (37 tools) + @injectivelabs/sdk-ts for signing & broadcast; keys never touch the model
- **A wallet that pays its own way** — x402 self-payment + ERC-8004 identity + feeRecipient rebates
- **Trust model:** the language model **reasons**; a deterministic risk engine **sizes** — Compation never hallucinates a position size. Every number on screen is computed, constraint-checked, and logged.

speaker note: The model proposes intent; it never emits a number. That separation is the safety story.

---

## Slide 7 — Live Demo

**Headline:** Watch it think, place, pay, and prove — end to end.

- "Hedge my $40k/month H100 exposure" → assess exposure → compute hedge → place hedge → summarize
- Headline trade venue: **NVDA/USDC perp** (NVIDIA makes the H100 — thematically tight, active, deep book) while the H100 perp is paused; the real H100 index is still read live
- Confirmation card → real tx hash → block explorer
- x402 panel: $0.01 USDC settlement tx + explorer link + latency
- Identity badge: ERC-8004 #49

speaker note: If running live, reset first (`demo:reset`) — it clears the decision trail but preserves identity #49. Embed the recorded run as fallback.

---

## Slide 8 — Why Now / Why Us

**Headline:** DeFAI is the hottest 2026 narrative — and we assembled the only-just-arrived pieces first.

- The on-chain H100 market, ERC-8004 identity, and x402 self-payment **all arrived recently** — a combination we haven't seen built before
- Among the first AI agents on the on-chain H100 compute-derivative market
- Real on-chain execution, a deterministic risk engine, and **67 agent unit tests** (risk engine 33, decimal scaling 13, error-normalizer 8, orchestrator 8, what-if 5)
- TypeScript end-to-end, pnpm workspaces — Next.js 16 / React 19 web, agent orchestrator, shared markets registry, Injective MCP

speaker note: The moat is integration timing — we shipped the combination first.

---

## Slide 9 — Business Model

**Headline:** Compation earns on every fill it executes — monetization is built in, not bolted on.

- The agent wallet is the **feeRecipient on every order** → it earns **protocol fee rebates** on every fill it places (true independent of registration)
- **ERC-8004 identity NFT #49** makes the agent a durable, recognized economic actor in Injective's registry
- Revenue scales directly with hedging volume — more hedges, more fees, no extra plumbing
- Future lines: **premium analytics**, **A2A signal sales**, **multi-compute coverage**

speaker note: Every trade the agent runs for a user also pays the agent. The flywheel is structural.

---

## Slide 10 — Ecosystem Fit

**Headline:** A registered Injective economic actor, built on Injective + Microsoft Azure end-to-end.

- **ERC-8004 identity = durable Injective infrastructure** — permissionless IdentityRegistry on Injective EVM; Compation registered as **NFT #49** (tx confirmed at block 131740980)
- feeRecipient on every fill → returns value into the Injective protocol economy
- Uses **Injective** (MCP + sdk-ts + on-chain markets) and **Microsoft Azure** (the runtime brain) end-to-end
- Clear incubation / expansion path inside the Injective ecosystem

speaker note: Registry tx is verifiable on the Injective testnet block explorer — show the badge links to it.

---

## Slide 11 — Roadmap

**Headline:** From hedging H100 today to compute treasury autopilot.

- **Availability hedging** — not just price, but securing capacity
- **More compute derivatives** — broaden beyond H100 as the asset class grows
- **Cloud-bill ingestion** — read real compute spend, hedge it automatically
- **Multi-agent (A2A)** — agents trading and sharing signals
- **Treasury autopilot** — continuous, policy-driven hedging of the whole compute budget

speaker note: Each step deepens both the product and the on-chain footprint.

---

## Slide 12 — Ask / Close

**Headline:** Compation is an autonomous agent that hedges your AI compute costs on-chain — and pays for its own compute while it does.

- **The ask:** incubation into the Injective Nova / Rising Star Program
- Submitting to the program (deadline June 30, 2026); Top 10 announced July 10, VC Demo Day late July
- Program upside: **Top 3 → $10,000 USDT each** ($5k cash + $5k Azure credits); **Top 10 →** milestone grants up to $10,000, follow-on investment up to **$1,000,000** from the Injective Foundation, up to **$150,000** in Azure credits, a VC Demo Day, and a fast-track to AdventureX 2026
- Non-custodial; keys never touch the model. Compation executes the user's stated intent — not a custodian or investment adviser. Not financial advice.

speaker note: Close on the one-liner again — bookend the deck with it.
