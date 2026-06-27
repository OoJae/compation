# Compation — Submission Checklist

**Program:** Injective Nova / Rising Star Program
**Submission deadline:** **June 30, 2026**
**Submit via TypeForm:** https://form.typeform.com/to/J8tQWS4p
**Live demo:** https://compation.vercel.app  ·  **Repo:** https://github.com/OoJae/compation

> One-liner: *Compation is an autonomous agent that hedges your AI compute costs on-chain — and pays for its own compute while it does.*

---

## Submission checklist

- [ ] Public GitHub repo is live and the complete README is committed (architecture, how-to-run, the three wow moments, disclaimer).
- [ ] Demo video recorded and uploaded; link added to the README and the TypeForm: `<VIDEO_LINK>`
- [ ] **Wow moment 1 — Live execution** is verifiable on-chain: a real signed long position opens on Injective and the confirmation card links to the tx on the block explorer.
- [ ] **Wow moment 2 — x402 self-payment** is verifiable: the panel shows the on-chain settlement tx hash + explorer link + latency for the 0.01 USDC paid to `https://agents.injective.com/api/x402/perps/market-data` (PaymentReceipt persisted).
- [ ] **Wow moment 3 — ERC-8004 identity** is verifiable: identity NFT #49 in Injective's IdentityRegistry, tx `0x0c96c4816f814e77d699ce9f00800c95d7d64abafcc5a3f250f3f3278452aea0`, confirmed at block 131740980 — [view on Blockscout](https://testnet.blockscout.injective.network/tx/0x0c96c4816f814e77d699ce9f00800c95d7d64abafcc5a3f250f3f3278452aea0).
- [ ] **Azure is visibly used:** the app header shows Azure OpenAI `gpt-5.4-mini` (deployment `compation-gpt`) via `@ai-sdk/azure` + the Vercel AI SDK.
- [ ] **"Not financial advice"** disclaimer is present in the app and the README (non-custodial; keys never touch the model; tooling that executes the user's stated intent, not a custodian or investment adviser).
- [ ] Pitch deck finalized and exported.
- [ ] Demo rehearsed end-to-end; `pnpm --filter @compation/agent demo:reset` run beforehand to clear the decision-trail DB (identity #49 preserved).
- [ ] Tests green: 67 agent unit tests pass (risk engine 33, decimal scaling 13, error-normalizer 8, orchestrator 8, what-if 5).
- [ ] *(Optional / encouraged)* Social post published tagging **@injective** and **@NinjaLabsHQ**.

---

## TypeForm fields — prepared answers

**Project name**
> Compation

**One-liner**
> Compation is an autonomous agent that hedges your AI compute costs on-chain — and pays for its own compute while it does.

**Short description**
> GPU rental prices — especially NVIDIA H100 — are volatile, opaque, and the dominant cost for anyone training or serving AI. A startup that budgets $40,000/month for H100s can watch that balloon when demand spikes, with historically no way to hedge it. Injective just put the first on-chain NVIDIA H100 rental-rate market live (Squaretower / Stork oracle), so compute is becoming an asset class. Compation is the autonomous agent that makes that market usable: natural-language intake, a deterministic risk engine that sizes the hedge, real signed execution on Injective, plain-language confirmations, a transparent decision trail, and a what-if simulator. *Azure brains, Injective hands, an on-chain wallet that pays its own way.*

**GitHub link**
> https://github.com/OoJae/compation

**Demo video link**
> `<VIDEO_LINK>`

**Team**
> `<TEAM_NAME / MEMBERS / CONTACT>`

**How it uses Injective**
> Compation executes real, signed positions on Injective via `@injectivelabs/sdk-ts` for signing and broadcast (the Injective MCP Server, 37 tools, is integrated for tool discovery) — keys never touch the model. It reads Injective's first on-chain NVIDIA H100 rental-rate market (H100/USDT PERP, oracle SQTWR_H100USD via Stork, ~$2.85/H100-hour) as the live index to hedge. Because that perp is currently paused for a USDT→USDC collateral migration, the tradeable hedge routes to the NVDA/USDC PERP proxy (NVIDIA makes the H100 — thematically tight, deep book), with INJ/USDC PERP as the deepest-book fallback; it auto-routes back to native H100 on relist. Trades settle in USDC from the default subaccount drawing on the bank balance. Compation is also a registered Injective economic actor: it holds ERC-8004 identity NFT #49 in Injective's on-chain IdentityRegistry, and its wallet is its own `feeRecipient` on every fill, so the relayer fee-share accrues to the agent rather than a middleman. It even pays for its own market-data/inference via an x402 endpoint, settled on Injective EVM. Testnet-only by choice for reliability; the mainnet write path exists and is hard-gated behind `ALLOW_MAINNET_WRITES=true`.

**How it uses Azure**
> The runtime brain is Azure OpenAI `gpt-5.4-mini`, deployed as deployment name `compation-gpt`, accessed via `@ai-sdk/azure` and the Vercel AI SDK (streamText / generateText / tool-calling). Azure handles intent understanding, strategy, and plain-language narration — and is shown in the app header. Critically, the language model **never emits a position size**: a deterministic risk engine sizes every hedge, and every number on screen is computed and constraint-checked. The model reasons; the risk engine sizes.

**What's innovative**
> Compation is among the first AI agents on the on-chain H100 compute-derivative market, and it assembles three things we haven't seen combined before: (1) automated H100 hedging — turning a trader-only perp into a one-sentence action for an AI founder; (2) an ERC-8004 on-chain identity (NFT #49) that makes the agent a registered economic actor, set as its own feeRecipient so the relayer fee-share accrues to it; and (3) x402 self-payment — the agent pays $0.01 USDC on-chain for the compute it uses. It's not a demo; it's a registered economic actor with the seed of a built-in business model. And the trust model is explicit: the language model reasons, a deterministic risk engine sizes — Compation never hallucinates a position size, every number is computed and constraint-checked, and every decision is logged.

---

## Draft social post

> Meet Compation: an autonomous agent that hedges your AI compute costs on-chain — and pays for its own compute while it does.
>
> ▸ Real signed H100 hedge on @injective
> ▸ Pays its own way via x402 (USDC)
> ▸ Registered on-chain (ERC-8004 #49)
>
> Azure brains, Injective hands. Built for @NinjaLabsHQ Nova.

*(Under 280 characters. Add the demo video / repo link when posting.)*

---

## Timeline

| Milestone | When |
| --- | --- |
| **Submission deadline** | **June 30, 2026** |
| Top 10 announced | July 10, 2026 |
| VC Demo Day | Late July 2026 |

**Prizes**
- **Top 3:** $10,000 USDT each — split $5,000 cash + $5,000 Azure credits.
- **Top 10:** milestone grants up to $10,000; potential follow-on investment up to $1,000,000 from the Injective Foundation; up to $150,000 in Azure credits; a VC Demo Day; and a fast-track to AdventureX 2026.

---

## Known limitations (be transparent)

- The H100 perp is **paused** for a USDT→USDC collateral migration, so the tradeable hedge uses the **NVDA/USDC proxy** while the real H100 index is still read live (key-lessly, via the oracle) for the dashboard.
- Testnet order books are thin, so a close can fail to fill.
- The demo runs **testnet-only by choice** for reliability; the mainnet write path exists and is hard-gated behind `ALLOW_MAINNET_WRITES=true`.

> **Disclaimer:** Non-custodial; keys never touch the model. Compation is tooling that executes the user's stated intent — not a custodian or investment adviser. Not financial advice.
