/**
 * Show and (if open) close the position on a venue. Also a demo-reset helper.
 *   EXECUTOR=sdk pnpm --filter @compation/agent position:close [venueKey]
 */
import { loadEnv } from './_shared';
loadEnv();
import { createExecutor } from '../src/injective/index';

const venueKey = process.argv.slice(2).find((a) => !a.startsWith('--')) ?? 'testnet:INJ_USDC';

async function main() {
  const executor = createExecutor();
  console.log(`executor=${executor.kind} venue=${venueKey}`);
  const pos = await executor.getPosition(venueKey);
  console.log('position:', pos ? JSON.stringify(pos) : 'none');
  if (pos) {
    const c = await executor.closeHedge(venueKey);
    console.log(`✅ closed tx: ${c.txHash}\n   ${c.explorerUrl}`);
  }
}
main().catch((e) => {
  console.error('FATAL', (e as Error)?.message ?? e);
  process.exit(1);
});
