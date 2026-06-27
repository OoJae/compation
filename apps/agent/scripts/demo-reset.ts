/**
 * Reset to a clean demo state between runs:
 *  - clears the decision-trail / position / x402-receipt rows from SQLite
 *    (the ERC-8004 identity in .env is preserved — #49 stays on the badge);
 *  - when EXECUTOR=sdk, closes any open hedge on the active route's testnet
 *    venues so the next demo opens fresh.
 *
 *   pnpm --filter @compation/agent demo:reset
 *   EXECUTOR=sdk pnpm --filter @compation/agent demo:reset   # also closes positions
 *   EXECUTOR=sdk pnpm --filter @compation/agent demo:reset testnet:INJ_USDC
 */
import { loadEnv } from './_shared';
loadEnv();
import { prisma } from '../src/db/index';
import { createExecutor } from '../src/injective/index';
import { getRoute } from '@compation/shared';

async function closeOpenPositions(): Promise<void> {
  const executor = createExecutor();
  if (executor.kind !== 'sdk') {
    console.log(`↪︎ executor=${executor.kind} — skipping on-chain close (no real positions).`);
    return;
  }
  const route = getRoute(process.env.COMPATION_ROUTE ?? 'dev');
  const argVenue = process.argv.slice(2).find((a) => !a.startsWith('--'));
  const venues = argVenue ? [argVenue] : [route.primaryVenueKey, ...route.fallbackVenueKeys];
  for (const venueKey of venues) {
    try {
      const pos = await executor.getPosition(venueKey);
      if (!pos) {
        console.log(`   ${venueKey}: no open position`);
        continue;
      }
      const c = await executor.closeHedge(venueKey);
      console.log(`   ${venueKey}: closed ✅ ${c.txHash}\n     ${c.explorerUrl}`);
    } catch (e) {
      // A blocked mainnet write or a thin testnet book shouldn't abort the reset.
      console.log(`   ${venueKey}: close skipped — ${(e as Error)?.message ?? e}`);
    }
  }
}

async function clearDb(): Promise<void> {
  // Delete children before Session (FK); keep IdentityRecord untouched.
  const steps = await prisma.decisionStep.deleteMany();
  const positions = await prisma.position.deleteMany();
  const receipts = await prisma.paymentReceipt.deleteMany();
  const sessions = await prisma.session.deleteMany();
  console.log(
    `🧹 cleared DB — sessions:${sessions.count} steps:${steps.count} positions:${positions.count} receipts:${receipts.count} (identity preserved)`,
  );
}

async function main(): Promise<void> {
  console.log('— Compation demo reset —');
  await closeOpenPositions();
  await clearDb();
  console.log(`\n✅ ready for demo. ERC-8004 identity #${process.env.ERC8004_TOKEN_ID ?? '?'} preserved.`);
}

main()
  .catch((e) => {
    console.error('FATAL', (e as Error)?.message ?? e);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
