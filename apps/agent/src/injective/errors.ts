/**
 * Map raw executor / gRPC / oracle failures into friendly, user-facing
 * {code, message} pairs the UI can show — never a raw stack trace. The
 * orchestrator tools already return {ok:false, error} for their own validation;
 * this covers the chain-call failures that THROW (RPC hiccups, insufficient
 * balance, thin liquidity, the mainnet gate, oracle gaps).
 */
import { MainnetWriteBlocked } from './types';

export interface FriendlyError {
  code: string;
  message: string;
}

/** Normalize a thrown execution error (compute/place path) into a friendly pair. */
export function normalizeExecutionError(e: unknown): FriendlyError {
  const raw = e instanceof Error ? e.message ?? '' : String(e ?? '');
  const m = raw.toLowerCase();

  if (e instanceof MainnetWriteBlocked || m.includes('mainnet write'))
    return {
      code: 'MAINNET_GATED',
      message: 'Mainnet trading is disabled in this build (safety gate). The demo runs on testnet.',
    };

  if (m.includes('insufficient') && (m.includes('fund') || m.includes('balance') || m.includes('margin')))
    return {
      code: 'INSUFFICIENT_BALANCE',
      message: 'The agent wallet has too little USDC to post margin for this hedge. Fund the wallet and retry.',
    };

  if (m.includes('orderbook') || m.includes('liquidity') || m.includes('cannot satisfy') || m.includes('no bids') || m.includes('no asks'))
    return {
      code: 'THIN_LIQUIDITY',
      message:
        'The venue order book is too thin to fill this size right now (common on testnet). Try a smaller size or the deeper fallback venue.',
    };

  if (m.includes('timeout') || m.includes('timed out') || m.includes('econn') || m.includes('fetch failed') || m.includes('unavailable') || m.includes('deadline') || m.includes('network error'))
    return {
      code: 'RPC_HICCUP',
      message: 'An Injective RPC node was briefly unreachable. This is usually transient — please retry.',
    };

  if (m.includes('private_key') || m.includes('private key') || m.includes('wallet:gen'))
    return {
      code: 'WALLET_UNCONFIGURED',
      message: 'The agent wallet is not configured (INJECTIVE_PRIVATE_KEY missing).',
    };

  if (m.includes('oracle') || (m.includes('price') && m.includes('stale')))
    return {
      code: 'ORACLE_UNAVAILABLE',
      message: 'The live price oracle is momentarily unavailable. Please retry in a moment.',
    };

  // Fallback — generic, never leaks internals.
  return {
    code: 'EXECUTION_FAILED',
    message: 'The hedge could not be placed due to an unexpected chain error. Please retry.',
  };
}

/**
 * Codes where the broadcast MAY have landed despite the thrown error (worth a
 * position reconciliation), vs. ones that definitely never submitted.
 */
const UNCERTAIN_CODES = new Set(['RPC_HICCUP', 'EXECUTION_FAILED']);
export function isUncertainExecutionError(code: string): boolean {
  return UNCERTAIN_CODES.has(code);
}

/** Friendly message for a failed agent turn (model/setup errors), shown in the chat. */
export function friendlyTurnError(e: unknown): string {
  const raw = e instanceof Error ? e.message : String(e ?? '');
  const m = raw.toLowerCase();
  if (m.includes('azure') || m.includes('deployment') || m.includes('api key') || m.includes('apikey') || m.includes('401') || m.includes('unauthorized'))
    return 'The Azure OpenAI brain is unreachable — check the AZURE_OPENAI_* settings. Compation needs its model to reason.';
  if (m.includes('private_key') || m.includes('wallet:gen'))
    return 'The agent wallet is not configured. Set INJECTIVE_PRIVATE_KEY in .env.';
  return 'Something interrupted the agent while running this turn. Please try again.';
}
