# Compation — Master Build Plan

> **Compation** — the autonomous agent that hedges your AI compute costs on-chain, and pays for its own compute while doing it.
>
> *Compute + Computation — with a little compassion for every founder watching their GPU bill.*

**Codename:** Compation
**Hackathon:** Injective Nova / Rising Star Program
**Submission deadline:** June 30, 2026 · **Top 10:** July 10 · **Demo Day:** late July
**Builder:** solo, full-time, building with Claude Code
**Goal:** #1.

---

## 0. How to use this document

This is the single source of truth for building Compation. Read sections 1–7 once to load the full picture, then work section 10 (Build Phases) top-to-bottom. Sections 11–17 are reference material you'll pull from as you build. The companion file `Compation_Claude_Code_Master_Prompt.md` is what you paste into Claude Code to start; it points back here.

**The one rule that wins this hackathon:** *one flawless end-to-end demo beats ten half-finished features.* Everything below is sequenced so that you have a working, demoable spine as early as possible, then layer differentiators onto it. If you run low on time, you ship the spine + whatever differentiators are done, and it still wins.

---

## 1. The product in one page

**What it is.** Compation is an autonomous AI agent that helps AI companies and independent builders hedge the single largest, most volatile line item on their P&L — GPU compute — by taking offsetting positions in Injective's on-chain **NVIDIA H100 GPU rental-rate perpetual** (H100/USDT Perp on Helix). You tell it (in plain language) roughly how much H100 compute you burn, and it calculates, places, and continuously manages a hedge that pays you when rental rates rise. It runs on Injective, reasons with Azure OpenAI, holds an on-chain ERC-8004 identity, and pays for its own data and inference via x402 micropayments — closing a poetic loop: *an AI agent that spends money on compute, and hedges the price of the very thing it spends on.*

**One-liner.** "Compation is an autonomous agent that hedges your AI compute costs on-chain — and pays for its own compute while it does."

**Who it's for.** AI startups, indie AI builders, inference-heavy SaaS, and DePIN/compute resellers whose margins live and die on GPU rental prices.

**Why it wins (the three wow moments):**

1. **"It hedged my compute bill in 20 seconds, live, on mainnet."** Natural-language intent → reasoned plan → real signed perp position on Injective → tx hash on the explorer. A real, novel financial action nobody has automated.
2. **"The agent just paid for itself."** During the demo, Compation pays an x402-gated endpoint ~$0.01 in USDC to fetch the data/inference it needed — settling on-chain in ~650ms. Software that pays for its own existence.
3. **"It's permanent infrastructure, and it earns."** Compation has an ERC-8004 on-chain identity in Injective's public agent registry, and earns protocol fees on every order it fills (its built-in business model). It's not a hackathon toy; it's a registered economic actor on mainnet.

**The 30-second judge hook (memorize this):** *"Every AI company's biggest cost is GPU compute, and that price swings wildly — but unlike oil, wheat, or interest rates, no one can hedge it. Injective just put the first NVIDIA H100 rental market on-chain. Compation is the autonomous agent that uses it: tell it your compute burn, and it builds and manages a hedge that pays you when GPU prices spike. And it pays for its own compute on-chain while doing it."*

---

## 2. The problem & the user

**The problem.** GPU rental prices (especially NVIDIA H100) are volatile and opaque, and they're the dominant cost for anyone training or serving AI. A startup that budgets $40k/month for H100s can see that balloon when demand spikes or supply tightens — and there has historically been no financial instrument to hedge it. Squaretower + Injective changed that by launching the first on-chain H100 hourly rental-rate perpetual. But a raw perpetual market is useless to a non-trader founder: they don't know the right hedge size, how to manage margin, when to rebalance, or how to read funding. **That gap — between "a market exists" and "a founder can actually use it" — is exactly what an AI agent should close.**

**The user (ICP).**
- Seed/Series-A AI startups with meaningful monthly H100 spend.
- Indie AI builders and inference-heavy SaaS where compute is >30% of COGS.
- Compute resellers / DePIN operators with rental-rate exposure on both sides.

**Why now.** Compute is becoming a recognized asset class (CME Group + Silicon Data compute futures, backed by DRW and Jump Trading; Squaretower cited as an "Early Player" in Messari's 2026 Theses). DeFAI/agentic finance is the hottest 2026 VC narrative. And Injective is the only L1 with the H100 market + agent identity + agent payments all live. The pieces only just arrived; Compation is the first to assemble them.

**The pitch to a VC (one sentence).** "Compation is the Bloomberg-Terminal-meets-autopilot for the compute economy: the agent layer that lets every AI company hedge, benchmark, and manage compute-cost risk on-chain — starting with H100s, expanding to every compute derivative."

---

## 3. What we're building (scope)

### MVP — must exist for the demo (non-negotiable)

1. **Conversational intake.** A chat UI where a user states their compute exposure in plain language ("I spend about $40k/month renting H100s").
2. **Reasoning + risk engine.** The agent interprets the intent (Azure OpenAI) and a deterministic risk module computes the exact hedge (size, notional, margin, leverage, liquidation buffer). *The LLM decides intent; deterministic code computes the numbers — never let the model freehand position sizes.*
3. **On-chain execution.** The hedge is placed on Injective's H100/USDT perp (or a fallback liquid perp — see §10 spike) via the Injective MCP Server / Trader SDK, returning a real tx hash.
4. **Plain-language confirmation + decision trail.** The agent explains what it did and why, in human terms, with the tx hash, and every reasoning step is logged and visible.
5. **Live position dashboard.** Shows the open hedge, P&L vs. the user's modeled compute bill, current H100 index price, and a "what-if" simulation ("if H100 rates rise 20%, your bill goes up $8k but this hedge gains ~$7.6k").
6. **x402 self-payment.** The agent pays at least one x402-gated endpoint in USDC during its workflow (the "pays for itself" moment).
7. **ERC-8004 identity.** Compation is registered on-chain via `inj-agent register`, visible in the agent registry, with a fee-recipient set.

### Stretch — add only after MVP is flawless

- **Autonomous monitoring loop.** A background worker re-reads the hourly H100 index, recomputes drift, and rebalances or alerts — turning Compation from "one-shot" into "always-on autopilot."
- **Funding-aware carry reporting.** Surface estimated monthly funding cost/benefit of holding the hedge.
- **Cloud-bill ingestion.** Upload a cloud GPU invoice/CSV; the agent infers exposure automatically instead of asking.
- **Sell its own signals (A2A).** Expose Compation's compute-risk read as an x402-gated endpoint other agents can pay for — hits the "agent-to-agent commerce" narrative.
- **Voice intake.** Speak your exposure; Azure Speech transcribes.
- **Multi-agent orchestration.** A "research agent" + "execution agent" split via Azure AI Foundry (Magentic-One) — deepens the "agent infrastructure" story.

### Explicit non-goals (say no to these)

- Not a general trading bot or a chat-to-trade-anything copilot (Jecta already exists).
- Not a custodial fund/vault (keep it non-custodial; it's tooling, not asset management).
- Not multi-chain at launch (Injective only; bridging is a later flourish).
- Not financial advice (frame as tooling; see §14).

---

## 4. The hedging thesis & the agent's brain

This is the intellectual core. Judges with finance backgrounds will probe it, so it must be correct and crisp.

### The hedge, precisely

An AI company consuming H100 GPU-hours has cost `= GPU_hours × rental_rate`. The risk is that `rental_rate` rises. The H100/USDT perp tracks the hourly H100 rental price, so a **long** position profits when the rate rises. Therefore:

> **To hedge rising compute costs, Compation goes LONG the H100 perp.**

**Sizing (delta-one hedge).** If the user consumes `Q` H100-hours over hedge horizon `H` (e.g., one month) and chooses hedge ratio `h` (0 < h ≤ 1, default e.g. 0.8 for a partial hedge), then the hedge size in H100-hour-equivalents is:

```
S = h × Q          (contracts, in H100-hours)
Notional = S × P    (P = current H100 hourly index price)
Margin   = Notional / L   (L = leverage, max 5x on H100)
```

**Why this is correct:** if the rate moves `P → P'`, the user's extra compute cost on `Q` hours is `Q × (P' − P)`. The long perp of size `S` gains `S × (P' − P)`. With `S = h × Q`, the perp offsets `h` of the cost change — a clean, defensible delta-one hedge.

**Constraints the risk engine enforces:**
- **Balance/margin:** required margin ≤ available USDT (minus a safety reserve).
- **Leverage cap:** respect the market max (5x on H100).
- **Liquidation buffer:** keep a configurable distance (e.g., ≥40%) from the liquidation price so an adverse move doesn't wipe the hedge.
- **Liquidity/slippage:** size to available order-book depth; split large orders; never cross more than a configured slippage tolerance.
- **Funding/carry:** estimate funding cost of holding the long (longs typically pay funding in contango); surface it as "monthly carry."

### The agent loop (observe → reason → size → act → explain → monitor)

1. **Observe.** Read the user's stated exposure (or ingested invoice), current H100 index price, funding rate, order-book depth, and account balance.
2. **Reason (Azure OpenAI).** Decide *intent and strategy*: full vs. partial hedge, horizon, urgency, whether to leg in. Produce a structured plan, not raw numbers.
3. **Size (deterministic risk engine).** Compute exact `S`, notional, margin, expected liquidation price, and slippage — in code, validated against constraints.
4. **Act (Injective).** Place the order via the MCP Server / Trader SDK; capture fills and tx hash.
5. **Explain.** Generate a plain-language summary ("I opened a long on H100 with $X notional, hedging ~80% of your ~$40k/month exposure; liquidation is far at $Y; estimated carry ~$Z/month. Tx: 0x…").
6. **Monitor (stretch).** On an interval aligned to the hourly oracle, re-evaluate drift and rebalance/alert.

**Design principle to advertise to judges:** *"The language model reasons; a deterministic risk engine sizes. Compation never hallucinates a position size — every number on screen is computed and constraint-checked, and every decision is logged."* This is exactly the trust story that wins autonomous-finance demos.

---

## 5. System architecture

**Tagline for the architecture slide: "Azure brains, Injective hands, an on-chain wallet that pays its own way."**

```
┌──────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Next.js)                            │
│   Chat panel  ·  Live hedge dashboard  ·  Decision-trail timeline     │
│   What-if compute-cost simulator  ·  ERC-8004 identity badge          │
└───────────────▲───────────────────────────────────────▲──────────────┘
                │ HTTP / WebSocket (stream)              │ reads
                │                                        │
┌───────────────┴────────────────────────────────────────┴──────────────┐
│                       AGENT SERVICE (Node/TypeScript)                  │
│                                                                        │
│   Orchestrator (Azure OpenAI via AI SDK)  ── decides intent/strategy   │
│        │ tool calls                                                    │
│        ▼                                                               │
│   ┌──────────────┐  ┌───────────────────┐  ┌────────────────────────┐  │
│   │ Risk Engine  │  │ Injective Executor │  │ x402 Payer             │  │
│   │ (deterministic│  │ (MCP client +     │  │ (@injectivelabs/x402   │  │
│   │  hedge math) │  │  @injectivelabs/   │  │  pays for data/inference│  │
│   │              │  │  sdk-ts)          │  │  in USDC)               │  │
│   └──────────────┘  └─────────▲─────────┘  └────────────────────────┘  │
│        │                       │                                       │
│   Decision-trail logger (DB)   │ stdio (MCP)                           │
└────────────────────────────────┼──────────────────────────────────────┘
                                  ▼
              ┌────────────────────────────────────────┐
              │   Injective MCP Server (local, stdio)  │
              │   22 tools: markets, funding, deposit, │
              │   open/close position, P&L, bridge     │
              │   AES-256-GCM keys, signs & broadcasts │
              └───────────────────▲────────────────────┘
                                  │ signed txs
                                  ▼
   ┌───────────────────────────────────────────────────────────────────┐
   │                    INJECTIVE (chain ID 1776 / testnet)            │
   │   H100/USDT Perp on Helix · on-chain CLOB · Exchange Precompile   │
   │   0x65 (fees → Compation) · ERC-8004 Identity Registry            │
   │   Squaretower H100 oracle (hourly)                                │
   └───────────────────────────────────────────────────────────────────┘
```

**Component responsibilities:**

- **Frontend (Next.js):** chat, dashboard, decision-trail timeline, what-if simulator, identity badge. Talks to the agent service via HTTP + WebSocket (for streamed reasoning).
- **Agent service (Node/TS):** the brain. Hosts the orchestrator (Azure OpenAI), the deterministic risk engine, the Injective executor, the x402 payer, and the decision-trail logger.
- **Injective MCP Server:** runs locally over stdio; the executor connects to it as an MCP client to reuse its battle-tested 22 tools (price/funding queries, subaccount deposit, open/close leveraged position, P&L, bridge). Keys stay local; the model only sees addresses and tx hashes. (Use `@injectivelabs/sdk-ts` directly for any precise programmatic placement the risk engine needs.)
- **x402 payer:** uses `@injectivelabs/x402` to pay x402-gated endpoints (e.g., a compute/inference endpoint like GPU-Bridge, or your own gated H100-data endpoint) in USDC. This is the "pays for itself" moment.
- **ERC-8004 identity:** minted once via `inj-agent register`; the fee-recipient is Compation's wallet so it earns protocol fees on fills.

**Why this split:** the LLM never touches keys or numbers; the risk engine is testable in isolation; the MCP server handles the gnarly chain mechanics; the frontend is a thin, beautiful shell. Each piece is independently demoable, which de-risks the build.

---

## 6. Tech stack

| Layer | Choice | Why |
|---|---|---|
| Language | **TypeScript end-to-end** | MCP Server, Trader SDK (`@injectivelabs/sdk-ts`), and `@injectivelabs/x402` are all TS/npm; one language = faster solo build. (Python SDK exists at `InjectiveLabs/sdk-python` if ever needed.) |
| Monorepo | **pnpm workspaces** (or Turborepo) | Simple, fast, good for a solo dev. |
| Frontend | **Next.js (App Router) + React + Tailwind + shadcn/ui** | Fast to make beautiful; streaming-friendly. |
| Agent runtime LLM | **Azure OpenAI (GPT-class) via Azure AI Foundry** | Satisfies the Microsoft sponsor; show the Azure resource on screen. (Claude Code is your *dev tool*; Azure OpenAI is the *runtime brain* — keep these distinct.) |
| Orchestration / tool-calling | **Vercel AI SDK** (`ai` package) with an Azure OpenAI provider | Clean, streaming tool-calling in TS. *Stretch:* swap to **Azure AI Foundry Agent Service** for hosted orchestration + OpenTelemetry tracing (decision trail) + content-safety guardrails. |
| Injective execution | **Injective MCP Server** (MCP client over stdio) + **`@injectivelabs/sdk-ts`** | Reuse 22 hardened tools; drop to the SDK for precise order placement. |
| Payments | **`@injectivelabs/x402`** (client + optional `injectivePaymentMiddleware`) | Agent pays for its own compute/data; optionally sell its own signals. |
| Identity | **Injective Agent CLI** (`inj-agent register`, from `InjectiveLabs/injective-agent-sdk`) | Mints ERC-8004 NFT identity; sets fee recipient. |
| Persistence | **SQLite + Prisma** (swap to Postgres/Supabase if hosting) | Stores decision trail, positions, payment receipts; trivial to set up. |
| Hosting (demo) | **Local** for agent + MCP server (stdio design); frontend local or Vercel | Local is expected and reliable for Demo Day. |

---

## 7. The Injective building blocks (ground-truth reference)

> Confirmed against Injective docs/blog as of late June 2026. Claude Code should still fetch the live docs (links in §18) at the start to confirm exact function signatures, package names, and market symbols — these can drift.

**H100 market**
- Market: **H100/USDT Perpetual** on Helix. Trade UI: `https://helixapp.com/futures/h100-usdt-perp/`. Docs: `https://docs.trading.injective.network/helix/trading/perpetuals/nvidia-h100-hourly-perp-h100`.
- Price feed: Squaretower oracle, **updated hourly**. **Up to 5x leverage.** Long or short exposure. Requires **USDT** in the Injective wallet to trade. >$20.3M cumulative volume.
- It is *explicitly designed* for "AI labs and data centers to lock in future compute costs to stabilize budgets" — i.e., Compation's exact thesis.

**MCP Server**
- Org: `InjectiveLabs`. TypeScript, **22 tools**, 262 tests, **AES-256-GCM** key encryption (scrypt). Runs locally, **stdio** transport; model sees only addresses + tx hashes.
- Tools span: query active markets & funding rates, deposit into a subaccount, open a leveraged position, monitor P&L, close a trade, bridge across chains (Ethereum, Base, Arbitrum, Solana).
- Signing: `MsgBroadcasterWithPk` (server-side) and EIP-712 (browser/MetaMask). Works with Claude Desktop, Cursor, LangChain, CrewAI.
- There is also an Injective **"Skills for Claude Code"** repo in the org — check it; it may accelerate agent integration.

**Injective Agents platform & ERC-8004**
- Register with one command: `inj-agent register --name Compation --type trading` → mints an **ERC-8004 NFT identity**, uploads the agent card to IPFS, registers on-chain.
- Registry: `agents.injective.com/registry` — shows token ID, type, capabilities, fee recipient, activity within **30 seconds**. Mainnet **chain ID 1776**. Audit via `8004scan.io` or token-ID lookup.
- **Exchange Precompile (EVM):** address `0x...0065` (`0x0000000000000000000000000000000000000065`). Trade from Solidity; set `fee_recipient` to your wallet to **earn protocol fees on every fill** (Compation's business model).
- Agent CLI repo: `github.com/InjectiveLabs/injective-agent-sdk`. Full flow testable on **testnet** before mainnet.
- Agent card (ERC-8004) supports a `services[]` array (MCP / A2A / web endpoints) and an `x402Support` boolean — set `x402Support: true` and advertise Compation's endpoints.

**x402**
- Install: `npm install @injectivelabs/x402`. Docs: `https://docs.injective.network/developers-ai/x402`. Demo: `agents.injective.com/x402`.
- Live on Injective mainnet; **USDC** settlement in **~650ms**; EIP-3009 gasless transfers; a **facilitator** abstracts RPC/gas/signature checks.
- Flow: client requests → server returns **HTTP 402** + price quote → client signs USDC payment → facilitator settles → server returns **200 OK** with data.
- Protect your own endpoint with one middleware call: `injectivePaymentMiddleware` (Express).
- Precedent to pay for compute: **GPU-Bridge** (`api.gpubridge.io`) is a real x402-native GPU inference provider — Compation can literally pay it for inference to close the "pays for its own compute" loop.

**Chain basics**
- Native EVM mainnet (MultiVM) since Nov 11, 2025; CosmWasm + EVM; sub-second blocks (~0.64s); zero gas for users; on-chain CLOB (no off-chain matching). TS SDK: `@injectivelabs/sdk-ts`. Python SDK: `InjectiveLabs/sdk-python`.

---

## 8. Prerequisites & accounts checklist

Do these before/at the start of Day 1.

**Injective**
- [ ] Create an Injective wallet for the agent (dedicated; never your personal funds). Securely store the private key (env var, encrypted at rest).
- [ ] Get **testnet** INJ + USDT from the Injective testnet faucet (for the build/test phase).
- [ ] Confirm whether the **H100/USDT perp exists on testnet**; if not, plan to either (a) demo the core loop on a liquid testnet perp and run the *headline* H100 hedge on mainnet with a tiny real position, or (b) run entirely on mainnet with minimal real USDT. (Decision made during the §10 spike.)
- [ ] For the final demo: a small amount of **real USDT** on Injective mainnet for a tiny, credible live H100 position; a small amount of **USDC** for x402 payments.

**Azure (Microsoft sponsor angle)**
- [ ] Azure account with **Azure OpenAI** access (personal/free-trial now; program Azure credits later). Deploy a GPT-class model; note endpoint + key.
- [ ] (Stretch) Azure AI Foundry project for hosted agent + tracing + content safety.

**Dev**
- [ ] Node.js LTS, pnpm, Git.
- [ ] Claude Code installed and pointed at the repo.
- [ ] A **public GitHub repo** named `compation` (required for submission; public, with a complete README).
- [ ] Anthropic/Claude Code config (your dev assistant — separate from the runtime LLM).

**Submission logistics (don't forget)**
- [ ] Project recruitment TypeForm submitted (`https://form.typeform.com/to/J8tQWS4p`).
- [ ] Joined the event WeChat group (QR on `injectivenova.com`).
- [ ] Plan for a ≤3-minute demo video and a pitch deck (see §12–13).

---

## 9. Repository structure

```
compation/
├── apps/
│   ├── web/                       # Next.js frontend (chat + dashboard + decision trail)
│   │   ├── app/
│   │   ├── components/            # ChatPanel, HedgeDashboard, DecisionTrail, WhatIfSim, IdentityBadge
│   │   └── lib/                   # API/WebSocket client
│   └── agent/                     # Agent service (Node/TS)
│       ├── src/
│       │   ├── orchestrator/      # Azure OpenAI tool-calling loop (Vercel AI SDK)
│       │   ├── risk/              # deterministic hedge math (PURE, unit-tested)
│       │   ├── injective/         # MCP client + sdk-ts executor
│       │   ├── x402/              # payment client (and optional gated endpoint)
│       │   ├── identity/          # ERC-8004 registration helpers / status
│       │   ├── trail/             # decision-trail logger
│       │   ├── server.ts          # HTTP + WebSocket API
│       │   └── monitor.ts         # (stretch) autonomous rebalancing loop
│       └── prisma/                # schema.prisma (positions, trail, receipts)
├── packages/
│   └── shared/                    # shared types, config, constants (market symbols, addresses)
├── infra/
│   └── mcp/                       # Injective MCP Server config / launch script (stdio)
├── scripts/
│   ├── register-agent.sh          # wraps `inj-agent register`
│   ├── faucet.md                  # how to fund testnet wallet
│   └── demo-reset.ts              # reset DB / positions for a clean demo run
├── docs/
│   ├── 01_Injective_Nova_Championship_Strategy_Brief.md
│   ├── Compation_Build_Plan.md    # (this file)
│   └── Compation_Claude_Code_Master_Prompt.md
├── .env.example                   # all required env vars, documented
├── README.md                      # the submission README (see §15)
└── package.json                   # pnpm workspaces root
```

---

## 10. Build phases & milestones

Work these in order. Each phase has a **Definition of Done (DoD)**. Do not start a phase before the previous DoD is met (except the Phase 0 spike, which gates everything).

### Phase 0 — Validation spike (Day 1, ~half a day) — *GATE*

**Goal:** prove the riskiest assumptions before committing.

- [ ] Stand up the Injective MCP Server locally; connect a throwaway script as an MCP client; **list markets** and confirm you can read the **H100/USDT perp** price + funding (on testnet and/or mainnet).
- [ ] Place **one tiny test position** (open + close) on a perp via the MCP Server on **testnet**, and capture a real tx hash.
- [ ] Confirm `@injectivelabs/x402` can pay a live x402-gated endpoint (the Injective x402 demo endpoint or GPU-Bridge) and get data back, with a USDC receipt.
- [ ] Confirm `inj-agent register` works on testnet and the agent appears in the registry.

**DoD / decision rule:**
- If you can read the H100 market **and** execute a test perp trade **and** make an x402 payment → **commit to Compation as specified.**
- If the **H100 market is unavailable/illiquid on the network you can demo on** → keep Compation's thesis but run the headline hedge on **mainnet with a tiny real position**, and use a **liquid perp (e.g., INJ/USDT or BTC/USDT) on testnet** for repeatable dev/testing. Document this in the README. (Do *not* abandon the H100 angle — it's the whole differentiator. Only change *where* it executes.)
- If, in the worst case, you cannot transact on the H100 market at all → fall back to candidate **#2 (ERC-8004 copy-trading)** from the strategy brief. (This should not happen, but the rule exists.)

### Phase 1 — The demo spine (Days 1–6) — *the thing that wins*

**Goal:** one flawless end-to-end path: chat intent → reasoning → deterministic hedge sizing → real on-chain order → plain-language confirmation with tx hash, rendered in a clean UI.

- [ ] Scaffold the monorepo (pnpm workspaces), `apps/web`, `apps/agent`, `packages/shared`, Prisma + SQLite.
- [ ] Build the **risk engine** as a pure module with unit tests: given (`monthly_spend` or `Q`, `P`, `h`, `L`, balance, depth) → returns (`S`, notional, margin, est. liquidation price, slippage, carry estimate) with all constraints enforced. *This is testable with zero chain access — do it first and lock it down.*
- [ ] Build the **Injective executor**: MCP client (stdio) wrapping open/close/query; plus `sdk-ts` for precise placement. Functions: `getMarket()`, `getPrice()`, `getFunding()`, `getBalance()`, `openHedge(size, price, leverage)`, `closeHedge()`, `getPosition()`.
- [ ] Build the **orchestrator** (Vercel AI SDK + Azure OpenAI) with tools: `assess_exposure`, `compute_hedge` (→ risk engine), `place_hedge` (→ executor), `summarize`. Enforce: model proposes intent/strategy; risk engine returns the numbers.
- [ ] Build the **chat UI** with streamed reasoning, and a **confirmation card** (what was done, why, tx hash linking to the explorer).
- [ ] Wire the **decision-trail logger**: persist every observation/decision/tool-call/result; render as a timeline.

**DoD:** From a clean state, you type "I spend about $40k/month on H100s, hedge most of it," and within ~20s a real perp position is opened on Injective, the UI shows a clear confirmation with a working explorer link, and the decision trail explains every step. Re-runnable reliably 5×.

### Phase 2 — The differentiators (Days 7–16)

**Goal:** layer the three wow moments and the dashboard onto the spine.

- [ ] **Live hedge dashboard:** open position, real-time H100 index price, P&L, and **modeled compute bill vs. hedge P&L**.
- [ ] **What-if simulator:** slider for "H100 rate ±X%" showing bill change vs. hedge gain/loss side by side. (Pure front-end math off the current position — high visual impact, low risk.)
- [ ] **x402 self-payment:** during the workflow, the agent pays an x402-gated endpoint in USDC (e.g., GPU-Bridge inference or your own gated H100-data route) and shows the receipt/tx + ~650ms settlement in the trail. This is wow moment #2.
- [ ] **ERC-8004 registration:** run `inj-agent register` for Compation; set fee recipient = agent wallet; show the **identity badge** in the UI (token ID, registry link) and confirm it earns fees on fills. This is wow moment #3.
- [ ] **Azure on screen:** make the orchestrator visibly use Azure OpenAI; if time allows, route through **Azure AI Foundry Agent Service** for tracing (feeds the decision trail) + content-safety guardrails (prompt-injection mitigation). Be able to point at the Azure resource during the demo.

**DoD:** All three wow moments fire on demand, the dashboard tells the compute-hedge story visually, and you can show Azure + ERC-8004 identity + x402 receipt live.

### Phase 3 — Polish, story, submission (Days 17–24)

**Goal:** make it look like a $100M startup and package it to win.

- [ ] **Design pass** (use the `frontend-design` skill): typography, spacing, a confident brand for Compation, smooth streaming, empty/loading/error states, mobile-reasonable.
- [ ] **Reliability pass:** graceful handling of RPC hiccups, slippage, insufficient balance, and oracle staleness; a `demo-reset` script; a tested "golden path" the demo follows.
- [ ] **Demo fallbacks:** a recorded screen capture of the full flow + screenshots, in case the live network misbehaves on Demo Day. (A broken live demo is fatal; always have a backup.)
- [ ] **README** (see §15), **3-min demo video** (see §12), **pitch deck** (see §13).
- [ ] **Submit** via TypeForm before June 30; optional social post tagging `@injective` and `@NinjaLabsHQ`.

**DoD:** Repo is public + documented, video + deck done, submission in, and you can deliver the live demo + 30-second hook in your sleep.

### Phase 4 — Stretch (only if Phases 1–3 are flawless)

Pick from §3 stretch list in this order of impact: autonomous monitoring loop → funding-aware carry → cloud-bill ingestion → sell-its-own-signals (A2A) → voice → multi-agent. **Never** start a stretch item if it risks the core demo's reliability.

---

## 11. Detailed implementation notes (per component)

**Risk engine (`apps/agent/src/risk`)**
- Pure functions, no I/O, fully unit-tested. Inputs come from the executor (prices, balance, depth) and the orchestrator (intent: `h`, horizon, urgency). Output is a typed `HedgePlan`.
- Implement: `computeHedgeSize`, `computeMargin`, `estimateLiquidationPrice`, `estimateSlippage`, `estimateFundingCarry`, `validatePlan` (throws typed errors: `InsufficientMargin`, `ExceedsLeverage`, `TooThinLiquidity`, `LiquidationBufferTooClose`).
- Keep all market params (tick size, min notional, max leverage) in `packages/shared` constants, fetched/validated at runtime.

**Injective executor (`apps/agent/src/injective`)**
- Launch the MCP Server as a child process over stdio; implement a small MCP client. Map the 22 tools you need (markets, funding, deposit, open, close, P&L). Prefer the MCP server for the conversational path.
- For deterministic placement (exact size/price/leverage from the risk engine), use `@injectivelabs/sdk-ts` directly.
- Always return structured results including the **tx hash** and fill details; surface explorer links.

**Orchestrator (`apps/agent/src/orchestrator`)**
- Vercel AI SDK `generateText`/`streamText` with `tools`. Azure OpenAI as the provider.
- System prompt rules: never invent numbers (call `compute_hedge`); always explain in plain language; always include the tx hash; refuse non-tooling/advice framing (say it's tooling, not investment advice).
- Stream reasoning tokens to the UI; persist each step to the trail.

**x402 payer (`apps/agent/src/x402`)**
- Client wrapper around `@injectivelabs/x402` to call a gated endpoint, handle the 402 → sign USDC → retry → 200 flow, and record the receipt (amount, tx, latency).
- (Stretch) Add `injectivePaymentMiddleware` to expose Compation's own gated "compute-risk read" endpoint for A2A.

**Identity (`apps/agent/src/identity` + `scripts/register-agent.sh`)**
- Wrap `inj-agent register --name Compation --type trading`; capture token ID; set fee recipient = agent wallet. Expose a `getIdentity()` that the UI badge reads (token ID + registry/8004scan link).

**Frontend (`apps/web`)**
- `ChatPanel` (streamed), `HedgeDashboard` (position, price, P&L, bill-vs-hedge), `DecisionTrail` (timeline), `WhatIfSim` (slider), `IdentityBadge`. Use shadcn/ui; keep it clean and confident. No browser storage of secrets — the agent service holds keys.

**Persistence (Prisma + SQLite)**
- Tables: `Position`, `DecisionStep`, `PaymentReceipt`, `IdentityRecord`. Enough to power the dashboard, trail, and a clean demo reset.

---

## 12. The "magic moments" demo script (≤3 minutes)

> Script it beat-by-beat; rehearse until flawless. Lead with the problem, not the tech.

1. **(0:00–0:30) Hook.** Deliver the 30-second hook from §1 over a clean landing screen. "No one can hedge GPU compute… until now."
2. **(0:30–1:15) The ask + the brain.** Type: *"I'm spending about $40,000/month renting H100s for my AI startup — hedge most of it."* Show the agent reason (streamed), then the **decision trail**: exposure assessed, H100 index read, deterministic hedge computed (size, notional, margin, liquidation buffer). Emphasize: *"the model reasons, but a deterministic engine sizes — no hallucinated numbers."*
3. **(1:15–1:50) Execution, live.** The hedge opens on Injective; the **confirmation card** shows the long position and a **tx hash** — click it to the explorer. *"That's a real position on Injective, right now."*
4. **(1:50–2:15) It pays for itself.** Trigger the step where Compation pays an x402 endpoint **$0.01 USDC** for the data/inference it used — show the receipt + ~650ms settlement in the trail. *"The agent just paid for its own compute, on-chain."*
5. **(2:15–2:40) What-if + the point.** Drag the simulator to "H100 +20%": the compute bill jumps, the hedge gains nearly as much. *"When GPU prices spike, the founder is protected."*
6. **(2:40–3:00) It's real infrastructure.** Show the **ERC-8004 identity badge** in Injective's registry and that Compation **earns protocol fees** on every fill. *"Compation isn't a demo — it's a registered economic actor on mainnet with a built-in business model."* Close on the one-liner.

---

## 13. Pitch deck outline (10–12 slides)

1. **Title** — Compation + one-liner + your name/handle.
2. **The problem** — GPU compute is every AI company's biggest, most volatile cost, and it's un-hedgeable.
3. **The shift** — Injective put the first on-chain NVIDIA H100 rental market live (Squaretower). Compute is becoming an asset class (CME/Silicon Data; Messari 2026 Theses).
4. **The gap** — a market exists, but founders can't use a raw perp. No agent automates it.
5. **Compation** — what it does, the three wow moments.
6. **How it works** — the architecture slide ("Azure brains, Injective hands, pays its own way"); the reason-vs-size trust model.
7. **Live demo** — (embed/the live run).
8. **Why now / why us** — DeFAI is the hottest 2026 narrative; you assembled the only-just-arrived pieces first.
9. **Business model** — built-in protocol fees on every fill (ERC-8004 fee recipient); future: premium analytics, A2A signal sales, multi-compute coverage.
10. **Ecosystem fit** — ERC-8004 identity = durable Injective infrastructure; uses Injective + Microsoft Azure end-to-end.
11. **Roadmap** — availability hedging, more compute derivatives, cloud-bill ingestion, multi-agent, treasury autopilot.
12. **Ask / close** — incubation + the one-liner.

---

## 14. Testing, safety & reliability

- **Test the math without the chain.** The risk engine is pure — unit-test it exhaustively (edge cases: tiny/huge exposure, thin liquidity, near-liquidation, zero balance). This is where correctness lives.
- **Testnet first, mainnet for the headline.** Build and iterate on testnet; for the demo's credibility, run a *tiny* real H100 hedge on mainnet with minimal USDT, and show the explorer.
- **Non-custodial framing.** Keep the model away from keys (MCP server design already enforces this). Frame Compation as *tooling that executes the user's stated intent*, not a custodian or an investment adviser. Put a clear "not financial advice" note in the UI and README.
- **Guardrails.** If using Azure AI Foundry, enable content-safety / prompt-injection (XPIA) mitigation; otherwise add basic input validation and refuse out-of-scope requests.
- **Fail gracefully.** Handle RPC errors, slippage beyond tolerance, insufficient margin, and stale oracle data with clear user-facing messages — never a raw stack trace on screen.
- **Demo safety net.** Always have a recorded full-flow video + screenshots ready. Have a `demo-reset` script for a clean state. Practice the live run on the actual demo machine/network.

---

## 15. Submission checklist

Per the program's stated requirements:

- [ ] **Public GitHub repo** (`compation`) with a **complete README**: what it is, the problem, architecture diagram, how to run (env vars, MCP server, faucet), the Injective integration (H100 market + MCP + x402 + ERC-8004), Azure usage, demo video link, and "not financial advice."
- [ ] **Injective integration is real and provable** — mainnet or testnet, with tx hashes / registry link in the README.
- [ ] **Demo video ≤ 3 minutes** — the §12 script; clearly shows core features + the three wow moments.
- [ ] **Pitch deck** — the §13 outline; vision, technical solution, roadmap.
- [ ] **Submit via TypeForm** (`https://form.typeform.com/to/J8tQWS4p`) before **June 30**.
- [ ] **Demo Day ready** (if Top 10): live demo + deck rehearsed; fallbacks in hand.
- [ ] *(Optional, encouraged)* social post tagging **@injective** and **@NinjaLabsHQ**.

**Map your build to the five judging criteria (put this in the README):**
- *Innovation* — first AI agent on the H100 compute-derivative market; assembles H100 + ERC-8004 + x402 (none combined before).
- *Technical implementation* — real on-chain execution via the MCP Server/SDK; deterministic risk engine; ERC-8004 identity; x402 settlement.
- *Application value* — hedges the largest cost for every AI company; clear ICP; built-in monetization.
- *Product experience* — natural-language intake, plain-language confirmations, decision trail, what-if simulator; AI lowers the barrier to a previously trader-only action.
- *Ecological compatibility* — registered Injective infrastructure earning protocol fees; uses Injective + Azure; obvious incubation/expansion path.

---

## 16. Risk register & fallbacks

| Risk | Likelihood | Mitigation / fallback |
|---|---|---|
| H100 market thin/unavailable on demo network | Medium | Per §10 spike: run headline hedge on mainnet (tiny real size); dev/test on a liquid perp; document clearly. Keep H100 as the story. |
| Azure Foundry integration eats time | Medium | Fall back to calling Azure OpenAI directly via the AI SDK (still satisfies the Microsoft angle). Foundry tracing/guardrails are stretch. |
| Live demo network failure | Medium | Pre-recorded full-flow video + screenshots; `demo-reset` script; rehearse on the demo machine. |
| First-party Injective copy-trading/DCA agents ship and overshadow | Low | Compation isn't generic — it's compute-cost hedging; differentiate on the H100/x402/"pays-for-itself" story. |
| Scope creep delays the spine | Medium | Hard rule: no Phase-2/3/4 work until the Phase-1 DoD is met and re-runnable 5×. |
| Regulatory/"is this advice?" optics | Low | Non-custodial framing; "tooling, not advice"; explicit disclaimer. |
| Someone already built this | Low | During the spike, check `agents.injective.com/registry`, the DoraHacks winner roster, and search; if a near-exact clone exists, lean harder into the autonomous monitoring + A2A signal-selling angle to differentiate. |

---

## 17. Post-MVP / fundability roadmap (for the deck & mentors)

- **Availability hedging**, not just price — Injective's own H100 docs flag availability risk as even more critical than price for AI labs.
- **More compute derivatives** — extend beyond H100 to other GPUs/compute indices as they list.
- **Cloud-bill ingestion & treasury autopilot** — connect billing, auto-maintain the hedge, manage the stablecoin treasury.
- **A2A compute-risk signals** — sell Compation's compute-cost read to other agents via x402 (agent-to-agent commerce).
- **Multi-agent** — research/execution split via Azure AI Foundry (Magentic-One) for the "agent infrastructure" story.
- **Reputation** — accumulate ERC-8004 reputation as a verifiable track record; a moat as the agent economy matures.

---

## 18. Reference links

**Injective — AI & agents**
- AI developer docs: `https://docs.injective.network/developers-ai/index`
- x402 docs: `https://docs.injective.network/developers-ai/x402`
- MCP Server announcement: `https://injective.com/blog/introducing-the-injective-mcp-server`
- Injective Agents platform: `https://agents.injective.com/` · registry: `https://agents.injective.com/registry`
- Injective Agents blog: `https://injective.com/blog/injective-agents-the-platform-for-autonomous-ai-trading-agents`
- Agent SDK / CLI: `https://github.com/InjectiveLabs/injective-agent-sdk`
- x402 explainer: `https://injective.com/blog/x402` · demo: `https://agents.injective.com/x402`

**H100 market**
- Helix H100 perp: `https://helixapp.com/futures/h100-usdt-perp/`
- H100 trading docs: `https://docs.trading.injective.network/helix/trading/perpetuals/nvidia-h100-hourly-perp-h100`
- Squaretower spotlight: `https://injective.com/blog/injective-ecosystem-spotlight-squaretower`
- GPU market launch: `https://injective.com/blog/injective-releases-the-first-ever-onchain-nvidia-gpu-market`

**SDKs & standards**
- Injective docs home: `https://docs.injective.network`
- TypeScript SDK: `@injectivelabs/sdk-ts` · Python SDK: `https://github.com/InjectiveLabs/sdk-python`
- Injective Build page: `https://injective.com/build`
- ERC-8004 spec: `https://eips.ethereum.org/EIPS/eip-8004`
- x402 standard: `https://www.x402.org`
- GPU-Bridge (x402 compute precedent): `https://api.gpubridge.io` (info at `gpubridge.io`)

**Microsoft / Azure**
- Azure AI Foundry / OpenAI models: `https://azure.microsoft.com/products/ai-foundry/models/openai`

**Program**
- Event site: `https://injectivenova.com/`
- Program blog: `https://injective.com/blog/injective-nova-program-cn`
- Project submission TypeForm: `https://form.typeform.com/to/J8tQWS4p`
- Independent developer TypeForm: `https://form.typeform.com/to/ug03BC6z`

---

*Build the spine first. Make it real on-chain. Make it pay for itself. Make it beautiful. Tell the story in 30 seconds. Win.*
