# Compation

**Autonomous AI agent that hedges NVIDIA H100 GPU compute costs on-chain — and pays for its own compute while doing it.**

Tell Compation your compute burn in plain language ("I spend ~$40k/month on H100s, hedge most of it"). It reads the **live on-chain H100 rental-rate index** on Injective, computes a precise delta-one hedge with a deterministic risk engine, and opens an offsetting **long** position — executed live on-chain. It carries an on-chain **ERC-8004 identity**, earns protocol fees on fills, and pays **x402** USDC micropayments for the data/inference it uses.

> **Built for the Injective Nova / Rising Star Program** (Injective · Microsoft · Web3Labs).
> _Not financial advice and not a custodian. Compation is tooling that executes the user's stated intent._

---

## ⚠️ Live status: H100 perp is paused → executing on NVDA proxy → auto-routes to native H100 on relist

As of June 2026, Injective is migrating all exchange markets from bridged **USDT → native USDC** (USDC + CCTP went live ~May 7, 2026). The native **`H100/USDT PERP` is currently `paused`** during this migration and is **not tradeable** — but its **index price is still live on-chain** (`SQTWR_H100USD` via the Stork oracle, ~$2.85/H100-hour). See [docs/04_Phase0_Spike_Report.md](docs/04_Phase0_Spike_Report.md).

So Compation:
1. **Reads the real, live H100 index** and **computes the real H100 hedge economics** (size, notional, margin, liquidation buffer, funding carry) — these stay front-and-center everywhere, with real numbers.
2. **Executes the live on-chain position on an active USDC venue as a transparent proxy** — primary **`NVDA/USDC PERP`** (NVIDIA makes the H100), with **`INJ/USDC PERP`** wired as an automatic fallback for fill reliability.
3. **Auto-routes to the native H100 perp the moment Injective relists it** — a one-line route change (`indexKey === venueKey`), thanks to the network-switch abstraction.

The proxy status is shown explicitly in the UI and here, by design.

---

## Architecture (Azure brains, Injective hands)

- **The LLM reasons; a deterministic risk engine sizes.** The model (Azure OpenAI via the Vercel AI SDK) decides intent/strategy only — it **never** emits a position size. Every number comes from a pure, fully unit-tested risk engine. → [`apps/agent/src/risk`](apps/agent/src/risk)
- **Network-switch abstraction:** one execution code path serves every venue/network; only the active `HedgeRoute` changes. → [`packages/shared/src/markets.ts`](packages/shared/src/markets.ts)
- **Keys never touch the model.** Signing happens below the tool boundary (sdk-ts in the agent service, or the MCP server's AES-256-GCM keystore); only addresses + tx hashes cross to the model.
- **Every action returns a real tx hash + explorer link**, persisted to a decision trail rendered as a timeline.

## Monorepo layout

```
apps/web        Next.js UI (chat, hedge dashboard, decision trail, what-if, identity badge)  [Phase 1–2]
apps/agent      Agent service: risk engine ✅, executor, orchestrator, x402, identity, trail
packages/shared Market registry + network/chain profiles + constants  ✅
infra/mcp       Injective MCP Server launch config (cloned from source; gitignored)
scripts         spike/, demo-reset, register-agent  (spike scripts under apps/agent/scripts)
docs            strategy brief, build plan, master prompt, Phase 0 spike report
```

## Status

- ✅ **Phase 0 spike** — markets read; H100 paused/USDC-migration confirmed; proxy + fallback architecture locked. ([report](docs/04_Phase0_Spike_Report.md))
- ✅ **Risk engine** — pure, deterministic, **33 unit tests** green. ([engine](apps/agent/src/risk/engine.ts))
- ⏳ **Demo spine** (Phase 1) — executor (sdk + MCP), orchestrator, chat UI, decision trail.

## Develop

```bash
pnpm install
pnpm --filter @compation/agent test          # risk-engine unit tests (no chain needed)
pnpm --filter @compation/agent spike:read     # read-only: print live H100 + venue params
```

Copy `.env.example` → `.env` and fill in (Azure OpenAI, a dedicated Injective wallet, etc.). Never commit secrets.

## Injective integration (verifiable)

| Piece | Detail |
|---|---|
| H100 index | `H100/USDT PERP` `0x56cb0ef0…f98f5efd` (paused), oracle `SQTWR_H100USD` / Stork, ~$2.85/hr |
| Execution venue | `NVDA/USDC PERP` `0xb9d9202c…0c17` (active), fallback `INJ/USDC PERP` `0x790aee46…3d31` |
| Settlement | USDC; x402 micropayments via `agents.injective.com/x402` (~650ms) |
| Identity | ERC-8004 via `inj-agent register`; fee-recipient = agent wallet |
| SDK / tooling | `@injectivelabs/sdk-ts` + Injective MCP Server (`InjectiveLabs/mcp-server`, ~37 tools) |
