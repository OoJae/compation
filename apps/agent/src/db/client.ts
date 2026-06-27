import { PrismaClient } from '@prisma/client';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

/**
 * Resolve the SQLite URL robustly. The web route constructs this client during
 * import (before .env is loaded) and runs with cwd=apps/web, so we can't rely on
 * process.env timing or a cwd-relative path. Prefer an explicit DATABASE_URL,
 * else walk up to the workspace root and point at apps/agent/prisma/dev.db.
 */
function resolveDbUrl(): string {
  const env = process.env.DATABASE_URL;
  if (env && env.startsWith('file:/')) return env; // an ABSOLUTE env url wins
  // Otherwise (relative env, e.g. the CLI's file:./dev.db, or unset) walk up.
  let dir = process.cwd();
  for (let i = 0; i < 7; i++) {
    if (existsSync(resolve(dir, 'pnpm-workspace.yaml'))) {
      return `file:${resolve(dir, 'apps/agent/prisma/dev.db')}`;
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return env ?? 'file:./dev.db';
}

// Singleton — avoid exhausting connections across Next.js hot-reloads.
const g = globalThis as unknown as { __compationPrisma?: PrismaClient };
export const prisma: PrismaClient =
  g.__compationPrisma ?? new PrismaClient({ datasourceUrl: resolveDbUrl() });
if (process.env.NODE_ENV !== 'production') g.__compationPrisma = prisma;
