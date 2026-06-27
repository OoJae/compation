# Phase 0 — Validation Spike Report

_Run: 2026-06-25, read-only against Injective mainnet + testnet via `@injectivelabs/sdk-ts`._
_Scripts: [`apps/agent/scripts/read-markets.ts`](../apps/agent/scripts/read-markets.ts), [`find-h100.ts`](../apps/agent/scripts/find-h100.ts), [`h100-status.ts`](../apps/agent/scripts/h100-status.ts), [`testnet-venue.ts`](../apps/agent/scripts/testnet-venue.ts)._

## Decision-rule outcome

**COMMIT to Compation — with a documented execution pivot.** The H100 thesis is intact (the live H100 index reads on mainnet), but the native H100 perp is **paused**, so the live on-chain execution runs on an active **USDC proxy venue** (NVDA/USDC), auto-routing to native H100 on relist. This is the build plan's "can read H100 but can't transact it" case — not the nuclear Path 3 (no ERC-8004 pivot needed).

## What we found on-chain (June 2026)

### 1. The H100 perp exists but is PAUSED — yet its index is LIVE
- Market: **`H100/USDT PERP`**, `marketId 0x56cb0ef0…f98f5efd`, **status `paused`**, order book **0 bids / 0 asks** → not tradeable.
- Index price feed is **still live**: **~$2.85 / H100-hour**, oracle `SQTWR_H100USD` (Squaretower) / `USDTUSD`, **oracleType `stork`**, updated hourly. Independent of the market pause.
- Params (for the hedge economics): tickSize 0.001, qtyTick 0.1, minNotional $1, initialMarginRatio 0.1818 (≈5.5x → 5x), maintenanceMargin 0.10, takerFee 0.0005, funding interval 3600s, hourlyFundingRateCap 0.0000275.

### 2. Why it's paused — the USDT→USDC migration
- Native **USDC + CCTP went live on Injective mainnet ~May 7, 2026**; every exchange dApp is migrating to native USDC, **phasing out bridged USDT/USDCnb**. ([cryptobriefing](https://cryptobriefing.com/injective-usdc-standard-migration/), [Injective blog](https://injective.com/blog/usdc))
- Consequence on-chain: **114 mainnet markets are `paused`** (the old USDT-quoted books), and **every active mainnet perp is now USDC-quoted**. Injective relaunched some on USDC (there's an active **`NVDA/USDC PERP`**) but has **not relaunched H100 on USDC**.
- **Relist outlook:** an H100/USDC relaunch is a governance decision with **no published timeline**; given H100's niche, low lifetime volume (~$20M), it is **not safe to assume a relist before late-July Demo Day**. We design for paused and auto-route to native H100 if/when it returns.

### 3. Active execution venues (all USDC, $1 min-notional, ~0 fees)
| Market | marketId (short) | Price | Book depth | Role |
|---|---|---|---|---|
| **NVDA/USDC PERP** | `0xb9d9202c…0c17` | ~$195.58 | 3 bids / 2 asks (thin) | **primary venue** (NVIDIA = H100 maker) |
| **INJ/USDC PERP** | `0x790aee46…3d31` | ~$4.25 | 31 bids / 43 asks (deep) | **fallback venue** (fill reliability) |
| BTC/USDC PERP | `0x0ee7ca44…1dee` | ~$60,118 | 14 / 15 | reference |

### 4. Testnet (dev) — active but THIN
- Only USDC perps active. `testnet:INJ/USDC` (`0xdc70164d…de41e`) active but book **0 bids / 3 asks** (wide). `testnet:BTC/USDC` empty; `testnet:ETH/USDC` 1 ask.
- **Implication:** repeatable dev iteration uses the **FakeExecutor** (deterministic, free); testnet is for signing/broadcast + ERC-8004 registration; the real fills happen on **mainnet** (NVDA primary → INJ fallback) for the headline.

## Locked architecture (from this spike)
- **H100 is the brain, always:** read the live H100 index, compute the real H100 hedge economics (size, notional, margin, carry) with real numbers — shown front-and-center in UI + README regardless of where execution lands.
- **Execution = transparent proxy with auto-fallback:** primary `NVDA/USDC` → fallback `INJ/USDC` for fill reliability; status shown explicitly in UI + README: _"native H100 perp paused → executing on NVDA proxy → auto-routes to native H100 on relist."_
- **Collateral is USDC** everywhere (not USDT). `.env.example` and the executor use USDC.
- Confirmed values are wired into [`packages/shared/src/markets.ts`](../packages/shared/src/markets.ts) (`MARKETS` + `ROUTES`).

## Phase 0.2 — signing → broadcast → finality verified (testnet, 2026-06-27)

Agent wallet `inj1t4a8x0fs2949c4x3lfsqzw7tnl7fyf0jdeyu7v` (self-generated, key in `.env`). Funded via the Injective faucet: `1 INJ` + **20 testnet USDC** (`erc20:0x0C382…`, the exact `testnet:INJ_USDC` margin denom) + 10 testnet USDT. Real txs ([`scripts/testnet-proof.ts`](../apps/agent/scripts/testnet-proof.ts)):
- bank `MsgSend` self → `EC949207…` ✅
- `MsgDeposit` → subaccount 1 → `0932094B…` ✅, `MsgWithdraw` ← subaccount 1 → `307B37F3…` ✅

**Executor-design finding (important):** on Injective the **default subaccount (index 0) IS the bank balance** — `MsgDeposit` into it is rejected ("subaccount id is not valid"); trading from the default subaccount draws **directly from the bank USDC balance**. Explicit deposit/withdraw only applies to **non-default** subaccounts (index ≥ 1). ⇒ the SdkExecutor trades from the default subaccount with **no deposit step** (simpler than the build plan's `subaccount_deposit` assumption).

## Spike status vs. plan
| Spike step | Status |
|---|---|
| 0.1 Read H100 + venues (mainnet & testnet) | ✅ done |
| 0.2 Signing/broadcast/finality on testnet (deposit/withdraw + send) | ✅ done — 3 real txs |
| 0.2b Real perp open/close | ⏳ Tier B executor (testnet thin → clean fill on mainnet NVDA) |
| 0.3 x402 payment to `agents.injective.com/x402` | ⏳ Phase 2 (wallet funding gate) |
| 0.4 `inj-agent register` (ERC-8004) | ⏳ Phase 2 |
