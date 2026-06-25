# Compation — Claude Code Master Prompt

> Paste the block below into Claude Code from the root of an empty `compation/` repo (with `docs/01_Injective_Nova_Championship_Strategy_Brief.md` and `docs/02_Compation_Build_Plan.md` already placed inside). It kicks off the build, sets the working agreements, and defines the first milestone. After the spike, continue by telling Claude Code to "proceed to Phase 1 per the build plan," etc.

---

```
You are my senior engineering partner building a hackathon-winning product called COMPATION. We are entering the Injective Nova / Rising Star Program (sponsors: Injective, Microsoft, Web3Labs) and we are going for the #1 spot. I build fast and full-time. Optimize every decision for: (1) a flawless live demo, (2) real on-chain execution, (3) a beautiful product, (4) a crisp story. One flawless end-to-end path beats ten half-built features — always.

================================================================
WHAT COMPATION IS
================================================================
Compation is an autonomous AI agent that lets AI companies and indie builders HEDGE their NVIDIA H100 GPU compute costs on-chain, and PAYS FOR ITS OWN COMPUTE while doing it. The user states their compute exposure in plain language ("I spend ~$40k/month on H100s"); Compation reasons about it, computes a precise hedge, and opens an offsetting LONG position on Injective's on-chain H100/USDT rental-rate perpetual (Helix). It has an on-chain ERC-8004 identity, earns protocol fees on every fill, and pays x402 micropayments in USDC for the data/inference it uses.

The three wow moments the demo must deliver:
1. "It hedged my compute bill in ~20s, live, on mainnet" — NL intent → reasoned plan → real signed perp position → tx hash on the explorer.
2. "The agent paid for itself" — Compation pays an x402-gated endpoint ~$0.01 USDC, settled on-chain in ~650ms.
3. "It's real infrastructure that earns" — ERC-8004 identity in Injective's registry + protocol fees on fills (built-in business model).

================================================================
READ FIRST (do this before writing any code)
================================================================
1. Read docs/02_Compation_Build_Plan.md IN FULL. It is the source of truth: architecture, hedging math, repo structure, phases, demo script, submission. Read docs/01_Injective_Nova_Championship_Strategy_Brief.md for context on why this wins.
2. Then fetch and skim the live Injective docs to confirm exact, current package names, function signatures, market symbols, and addresses (they can drift):
   - https://docs.injective.network/developers-ai/index
   - https://docs.injective.network/developers-ai/x402
   - https://injective.com/blog/introducing-the-injective-mcp-server
   - https://agents.injective.com/  and  https://injective.com/blog/injective-agents-the-platform-for-autonomous-ai-trading-agents
   - https://github.com/InjectiveLabs/injective-agent-sdk
   - https://docs.trading.injective.network/helix/trading/perpetuals/nvidia-h100-hourly-perp-h100
   - Also check the InjectiveLabs GitHub org for the MCP Server repo and any "Skills for Claude Code" repo, and the TypeScript SDK (@injectivelabs/sdk-ts).
3. Produce a short written PLAN before coding: confirm the stack, list the exact Injective packages/tools you'll use, and outline Phase 0 + Phase 1 tasks. Wait for my "go" before scaffolding.

================================================================
TECH STACK (default — challenge it only with a strong reason)
================================================================
- TypeScript end-to-end. Monorepo via pnpm workspaces.
- Frontend: Next.js (App Router) + React + Tailwind + shadcn/ui.
- Agent runtime LLM: Azure OpenAI (GPT-class) — this satisfies the Microsoft sponsor and MUST be visibly used. (You, Claude Code, are my DEV tool; the agent's RUNTIME brain is Azure OpenAI. Keep these separate.)
- Orchestration/tool-calling: Vercel AI SDK (`ai`) with an Azure OpenAI provider. (Stretch: Azure AI Foundry Agent Service for hosted orchestration + OpenTelemetry tracing + content-safety guardrails.)
- Injective execution: the Injective MCP Server (connect as an MCP client over stdio to reuse its 22 hardened tools), plus @injectivelabs/sdk-ts for precise programmatic order placement.
- Payments: @injectivelabs/x402 (client; optional injectivePaymentMiddleware to expose our own gated endpoint).
- Identity: Injective Agent CLI — `inj-agent register --name Compation --type trading` mints the ERC-8004 NFT; set fee_recipient = our agent wallet.
- Persistence: Prisma + SQLite (positions, decision trail, payment receipts, identity).
- Repo layout: follow §9 of the build plan exactly (apps/web, apps/agent, packages/shared, infra/mcp, scripts, docs).

================================================================
ARCHITECTURE INVARIANTS (do not violate)
================================================================
- "Azure brains, Injective hands." The LLM decides INTENT/STRATEGY; a DETERMINISTIC risk engine computes ALL numbers (hedge size, notional, margin, liquidation price, slippage, carry). The model must NEVER freehand a position size. Build the risk engine as a PURE, fully unit-tested module with no I/O — and build it FIRST, before any chain integration.
- Keys never touch the model. The MCP Server holds keys locally (AES-256-GCM) and signs; the model only sees addresses and tx hashes. The agent service holds secrets; the frontend never does (no secrets in browser storage).
- Every action returns a real tx hash and surfaces an explorer link. Persist every observation/decision/tool-call/result to the decision trail and render it as a timeline.
- Non-custodial framing: Compation is TOOLING that executes the user's stated intent — not a custodian, not investment advice. Add a clear "not financial advice" note in UI + README.

================================================================
THE HEDGE MATH (implement exactly; see build plan §4)
================================================================
To hedge RISING compute costs, go LONG the H100 perp (long profits when rental rate rises).
  S        = h × Q                 // hedge size in H100-hour-equivalents; Q = H100-hours over horizon; h = hedge ratio (default 0.8)
  Notional = S × P                 // P = current H100 hourly index price
  Margin   = Notional / L          // L = leverage (max 5x on H100)
Enforce constraints with typed errors: InsufficientMargin, ExceedsLeverage, TooThinLiquidity, LiquidationBufferTooClose (keep >= ~40% from liquidation). Estimate funding carry and surface it. Unit-test edge cases: tiny/huge exposure, thin liquidity, near-liquidation, zero balance.

================================================================
BUILD SEQUENCE (gate each phase on its Definition of Done)
================================================================
PHASE 0 — VALIDATION SPIKE (do this first; it GATES everything):
  - Stand up the Injective MCP Server locally; as an MCP client, list markets and read the H100/USDT perp price + funding (testnet and/or mainnet).
  - Open + close ONE tiny test perp position on TESTNET via the MCP Server; capture a real tx hash.
  - Make ONE real x402 payment to a live gated endpoint (the Injective x402 demo or GPU-Bridge) and get data back, with a USDC receipt.
  - Run `inj-agent register` on testnet; confirm Compation appears in the registry.
  - REPORT BACK with results and the decision rule from build plan §10:
      * H100 readable + test trade + x402 work → commit to Compation as specified.
      * H100 unavailable/illiquid on the demo network → keep the H100 thesis but run the headline hedge on MAINNET with a tiny real position, and dev/test on a liquid perp (INJ/USDT or BTC/USDT). Document it.
      * Cannot transact H100 at all → flag me; fallback is candidate #2 (ERC-8004 copy-trading).

PHASE 1 — THE DEMO SPINE (the thing that wins):
  - Scaffold the monorepo + Prisma/SQLite.
  - Build & unit-test the PURE risk engine first (no chain needed).
  - Build the Injective executor (MCP client + sdk-ts): getMarket/getPrice/getFunding/getBalance/openHedge/closeHedge/getPosition.
  - Build the orchestrator (Vercel AI SDK + Azure OpenAI) with tools: assess_exposure, compute_hedge (→ risk engine), place_hedge (→ executor), summarize.
  - Build the chat UI (streamed reasoning) + a confirmation card (what/why + tx hash + explorer link).
  - Wire the decision-trail logger + timeline.
  - DoD: from a clean state, "I spend ~$40k/month on H100s, hedge most of it" opens a real perp position in ~20s with a clear confirmation + working explorer link + full decision trail. Re-runnable reliably 5×.

PHASE 2 — DIFFERENTIATORS: live hedge dashboard (position, H100 price, P&L, modeled bill vs hedge), what-if simulator (rate ±X% → bill change vs hedge gain), x402 self-payment in the workflow (wow #2), ERC-8004 registration + identity badge + fees on fills (wow #3), Azure visibly used (stretch: Foundry tracing/guardrails).

PHASE 3 — POLISH + SUBMISSION: design pass (use the frontend-design skill), reliability/error handling, demo-reset script, recorded-demo fallback, README (map to the 5 judging criteria), 3-min demo video, pitch deck; submit before June 30.

PHASE 4 — STRETCH (only if 1–3 are flawless): autonomous monitoring loop → funding-aware carry → cloud-bill ingestion → sell-its-own-signals (A2A) → voice → multi-agent. Never risk the core demo for a stretch item.

================================================================
WORKING AGREEMENTS
================================================================
- Work in small, verifiable increments; after each, tell me what changed and how to test it. Keep a running TODO of phase progress.
- Do NOT start a later phase until the current phase's DoD is met and the spine is re-runnable 5×.
- Don't over-engineer. Prefer the simplest thing that makes the demo real and reliable. No premature abstractions, no microservices, no speculative config.
- Put all secrets in .env (provide a documented .env.example). Never hardcode keys. Never commit secrets.
- ASK ME before: spending real mainnet funds, any irreversible on-chain action, or changing the core architecture/scope. Tiny testnet actions: proceed.
- When the live Injective API differs from this prompt, trust the live docs and tell me what differed.
- Keep the README submission-ready as you go (it's required and judged).

Start by reading the two docs in /docs, then fetching the live Injective references, then giving me your written PLAN for Phase 0 + Phase 1. Wait for my "go" before scaffolding.
```

---

## Tips for driving Claude Code after the kickoff

- **Gate on the spike.** Don't let it scaffold the whole app before the Phase 0 results are in — the spike result can change *where* you execute (testnet vs. mainnet).
- **Make it build the risk engine first.** It's pure and unit-testable with zero chain access, so it's the safest, highest-leverage starting point and it locks down the math judges will probe.
- **Hold the line on scope.** If it drifts into Phase 2/3 work before the spine is re-runnable 5×, redirect it back. The spine is what wins.
- **Keep Azure visible.** Periodically confirm the runtime is actually calling Azure OpenAI (not just Claude/anything else) — the Microsoft sponsor needs to see Azure on screen.
- **Demo dress rehearsal.** A few days before submission, have it produce the `demo-reset` script and a recorded full-flow capture as your fallback. Then rehearse the live run on the actual machine/network.
- **Ground-truth check.** Have it paste the exact H100 market symbol, the MCP tool names it's using, the x402 package version, and the ERC-8004 fee-recipient setup into the README so everything is verifiable.
