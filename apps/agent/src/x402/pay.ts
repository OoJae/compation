/**
 * x402 self-payment — the agent pays a tiny USDC micropayment for the live
 * market data it uses, settled on-chain. Points at the live Injective x402
 * endpoint (its production facilitator settles reliably on testnet with our
 * testnet USDC). The agent signs an EIP-3009 authorization (gasless); the
 * facilitator submits + confirms.
 */
import { createInjectiveClient, parsePaymentResponseHeader } from '@injectivelabs/x402/client';

const ENDPOINT = process.env.X402_ENDPOINT ?? 'https://agents.injective.com/api/x402/perps/market-data';
const NETWORK = 'eip155:1439';
const AMOUNT_USDC = 0.01;

export interface X402Receipt {
  ok: boolean;
  endpoint: string;
  amountUsdc: number;
  network: string;
  latencyMs: number;
  txHash?: string;
  explorerUrl?: string;
  payer?: string;
  dataPreview?: string;
  error?: string;
}

/** Pay the x402 endpoint and return a structured receipt (best-effort). */
export async function payForMarketData(env: NodeJS.ProcessEnv = process.env): Promise<X402Receipt> {
  const pk = env.INJECTIVE_PRIVATE_KEY as `0x${string}` | undefined;
  const base: X402Receipt = { ok: false, endpoint: ENDPOINT, amountUsdc: AMOUNT_USDC, network: NETWORK, latencyMs: 0 };
  if (!pk) return { ...base, error: 'INJECTIVE_PRIVATE_KEY missing' };

  const client = createInjectiveClient({ privateKey: pk, preferredNetworks: [NETWORK] });
  const t0 = Date.now();
  try {
    const res = await client.fetch(ENDPOINT);
    const latencyMs = Date.now() - t0;
    const receipt = parsePaymentResponseHeader(res);
    const data = (await res.json().catch(() => null)) as { status?: string; markets?: { ticker?: string; markPrice?: string }[] } | null;
    const m = data?.markets?.[0];
    const dataPreview = m?.ticker ? `${m.ticker} @ ${Number(m.markPrice ?? 0).toFixed(4)}` : (data?.status ?? 'market data');
    const txHash = receipt?.transaction || undefined; // "" on failure → undefined
    const ok = Boolean(receipt?.success);
    return {
      ...base,
      ok,
      latencyMs,
      txHash,
      explorerUrl: txHash ? `https://testnet.blockscout.injective.network/tx/${txHash}` : undefined,
      payer: receipt?.payer,
      network: receipt?.network ?? NETWORK,
      dataPreview: String(dataPreview).slice(0, 80),
      ...(ok ? {} : { error: 'settlement not confirmed' }),
    };
  } catch (e) {
    // Don't leak raw SDK/RPC internals to anonymous clients; log server-side.
    console.error('[x402] payment failed:', e);
    return { ...base, latencyMs: Date.now() - t0, error: 'x402 payment failed' };
  }
}
