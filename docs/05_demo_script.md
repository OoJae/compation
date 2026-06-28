# Compation — Demo Script

**3-minute live demo runbook.** Tight, rehearsable, judge-facing.

> *Azure brains, Injective hands, an on-chain wallet that pays its own way.*

---

## Before you start (reset)

Do these in order, every time, before the lights come up:

1. **Reset the decision trail** — clears the demo DB rows, preserves identity NFT #49:
   ```bash
   pnpm --filter @compation/agent demo:reset
   ```
2. **Pick your executor** (set in `.env`):
   - `EXECUTOR=sdk` → a **real signed testnet open** (the headline path; gives you a live tx hash for WOW #1).
   - `EXECUTOR=fake` → safe fallback if the testnet book looks flaky; everything still renders, no real broadcast.
3. **Start the dev server**:
   ```bash
   pnpm --filter @compation/web dev
   ```
4. **Open** http://localhost:3000 — the **landing site**. Open with the hero, then click **Open demo →** to reach the agent at **/app** (or go straight to http://localhost:3000/app).
5. **Confirm the app header** shows **Azure OpenAI (`compation-gpt`, gpt-5.4-mini)** and **Injective testnet** — this is the Microsoft + Injective proof, on screen, the whole time.
6. **Have the recorded fallback video queued** and ready to cut to (see "If something fails").

Sanity notes:
- The **H100 index is read live** (key-less oracle read of `SQTWR_H100USD` via Stork, ~$2.85/H100-hour) even though the **H100 perp is paused** for the USDT→USDC collateral migration.
- The **tradeable hedge executes on the NVDA/USDC perp proxy** (NVIDIA makes the H100 — thematically tight, deep book), with **INJ/USDC** as the fallback venue.
- Trades execute from the **default subaccount drawing on the bank USDC balance** — no separate deposit step.

---

## The script

| Time | What you do (on screen) | What you SAY |
|------|-------------------------|--------------|
| **0:00–0:30**<br>Hook | Clean landing screen. Don't touch anything — just talk. | "Every AI company's biggest cost is GPU compute, and that price swings wildly — but unlike oil, wheat, or interest rates, no one can hedge it. Injective just put the first NVIDIA H100 rental market on-chain. Compation is the autonomous agent that uses it: tell it your compute burn, and it builds and manages a hedge that pays you when GPU prices spike. And it pays for its own compute on-chain while doing it." |
| **0:30–1:15**<br>The ask + the brain | Type into chat: **"I'm spending about $40,000/month renting H100s for my AI startup — hedge most of it."** Let the agent reason (streamed). Then walk the **decision trail**: exposure assessed → H100 index read live → deterministic hedge computed (size, notional, margin, liquidation buffer). | "I tell it my burn in plain English. Azure's model reasons about intent and strategy — but watch the decision trail: a deterministic risk engine sizes the position. The model reasons, but the engine sizes — no hallucinated numbers. Every figure on screen is computed, constraint-checked, and logged." |
| **1:15–1:50**<br>Execution, live **[WOW #1]** | The hedge opens on Injective. The **confirmation card** shows the long position and a **real tx hash** → click it through to the block explorer. | "That's a real position on Injective, right now." |
| **1:50–2:15**<br>It pays for itself **[WOW #2]** | Trigger the **x402** step. Compation pays **$0.01 USDC** for the market-data/inference it used. The **x402 panel** shows the settlement tx hash, explorer link, and latency. | "The agent just paid for its own compute, on-chain — gasless USDC, settled on Injective." |
| **2:15–2:40**<br>What-if + the point | Drag the **simulator** to **"H100 +20%"**: the compute bill jumps, and the hedge gains nearly as much. | "When GPU prices spike, the founder's bill goes up — but the hedge pays out almost the same amount. The founder is protected." |
| **2:40–3:00**<br>Real infrastructure **[WOW #3]** | Show the **ERC-8004 identity badge (#49)** in Injective's on-chain registry. Note the wallet is **feeRecipient on every fill** → earns protocol fee rebates. | "Compation holds an ERC-8004 identity in Injective's registry, and it earns protocol fees on every fill. Compation isn't a demo — it's a registered economic actor with a built-in business model. Compation is an autonomous agent that hedges your AI compute costs on-chain — and pays for its own compute while it does." |

---

## The three wow moments

In order, with the on-screen proof:

1. **Live execution** — a real signed position opens on Injective. **Proof:** the confirmation card's **tx hash → block explorer**. *"That's a real position on Injective, right now."*
2. **It pays for itself (x402)** — Compation pays the x402 endpoint **$0.01 USDC** for the data/inference it used. **Proof:** the **x402 panel** — on-chain settlement tx hash + explorer link + latency (persisted as a `PaymentReceipt`). *"The agent just paid for its own compute, on-chain."*
3. **Real infrastructure (ERC-8004)** — Compation is a registered economic actor and earns fee rebates. **Proof:** the **ERC-8004 identity badge #49** in Injective's `IdentityRegistry` ([registration tx on the explorer](https://testnet.blockscout.injective.network/tx/0x0c96c4816f814e77d699ce9f00800c95d7d64abafcc5a3f250f3f3278452aea0), confirmed at block 131740980), and the wallet set as **feeRecipient** on every order. *"Compation isn't a demo — it's a registered economic actor with a built-in business model."*

---

## If something fails

Stay calm, keep talking, and use the plan — never let the demo stall.

- **Cut to the recorded fallback video.** It's queued and ready. Narrate over it with the same lines; the audience won't lose the thread.
- **Testnet thin-book caveat (say it out loud, confidently):** "Testnet order books are thin, so a fill can lag — on mainnet this is instant. We run testnet by choice for reliability; the mainnet write path exists and is hard-gated behind `ALLOW_MAINNET_WRITES`." If an **open** doesn't fill cleanly, flip to `EXECUTOR=fake` for the run — the full UI, decision trail, x402 panel, and identity badge all still render.
- **The H100 perp is paused** (USDT→USDC collateral migration). That's expected: the **H100 index still reads live**, and the tradeable hedge uses the **NVDA/USDC proxy**. Frame it as a feature — Compation auto-routes to the live venue.
- **Never show a stack trace.** The app surfaces a friendly message instead. If you see one, cut to the video.

---

## One-liner to close on

> **Compation is an autonomous agent that hedges your AI compute costs on-chain — and pays for its own compute while it does.**
