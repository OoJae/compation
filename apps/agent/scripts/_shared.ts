/** Shared helpers for agent scripts: locate the repo root and load its .env. */
import { config } from 'dotenv';
import { resolve } from 'node:path';

/** apps/agent/scripts → repo root. */
export const REPO_ROOT = resolve(import.meta.dirname, '../../..');

/** Load the repo-root .env regardless of the script's cwd. */
export function loadEnv(): void {
  config({ path: resolve(REPO_ROOT, '.env') });
}

/** Humanize an unscaled on-chain amount string for common denoms. */
export function humanizeAmount(amount: string, denom: string): string {
  const d = denom.toLowerCase();
  let decimals = 0;
  if (d === 'inj') decimals = 18;
  else if (d.includes('usdc') || d.includes('usdt') || d.includes('peggy0xdac17') || d.includes('erc20:0xa00c59')) decimals = 6;
  if (decimals === 0) return `${amount} ${denom}`;
  const v = Number(amount) / 10 ** decimals;
  const sym = d === 'inj' ? 'INJ' : d.includes('usdt') ? 'USDT' : 'USDC';
  return `${v} ${sym}`;
}
