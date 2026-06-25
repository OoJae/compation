/**
 * Phase 0.1 deep probe — is the H100 perp anywhere on Injective?
 * Checks the indexer across ALL market statuses AND the chain directly, and
 * scans every ticker for GPU/compute/NVIDIA/H100 names. Read-only.
 */
import {
  IndexerGrpcDerivativesApi,
  ChainGrpcExchangeApi,
} from '@injectivelabs/sdk-ts';
import { getNetworkEndpoints, Network } from '@injectivelabs/networks';

const NEEDLE = /H100|NVIDIA|NVDA|GPU|COMPUTE|SQUARE|RENTAL|HOPPER|H200|B200/i;
const STATUSES = ['active', 'paused', 'expired', 'demolished', 'unspecified'];

async function probeIndexer(label: string, network: Network) {
  const endpoints = getNetworkEndpoints(network);
  const api = new IndexerGrpcDerivativesApi(endpoints.indexer);
  console.log(`\n==== ${label} INDEXER (${endpoints.indexer}) ====`);

  const seen = new Map<string, string>(); // marketId -> "ticker [status]"
  for (const status of STATUSES) {
    try {
      const markets = (await api.fetchMarkets({ marketStatus: status })) as unknown as {
        marketId: string;
        ticker?: string;
      }[];
      console.log(`  status=${status}: ${markets.length} markets`);
      for (const m of markets) {
        seen.set(m.marketId, `${m.ticker} [${status}]`);
        if (NEEDLE.test(m.ticker ?? '')) {
          console.log(`    >>> MATCH: ${m.ticker} (${m.marketId}) status=${status}`);
        }
      }
    } catch (err) {
      console.log(`  status=${status}: ERROR ${(err as Error)?.message ?? err}`);
    }
  }
  const matches = [...seen.values()].filter((t) => NEEDLE.test(t));
  console.log(`  TOTAL unique markets across statuses: ${seen.size}`);
  console.log(`  NEEDLE matches: ${matches.length ? matches.join(', ') : 'NONE'}`);
}

async function probeChain(label: string, network: Network) {
  const endpoints = getNetworkEndpoints(network);
  const api = new ChainGrpcExchangeApi(endpoints.grpc);
  console.log(`\n==== ${label} CHAIN (${endpoints.grpc}) ====`);
  try {
    const markets = (await api.fetchDerivativeMarkets()) as unknown as {
      market?: { marketId?: string; ticker?: string; status?: string };
      ticker?: string;
      marketId?: string;
    }[];
    console.log(`  chain returned ${markets.length} derivative markets`);
    const matches = markets.filter((m) =>
      NEEDLE.test(m.ticker ?? m.market?.ticker ?? ''),
    );
    if (matches.length) {
      for (const m of matches) {
        console.log(`    >>> CHAIN MATCH: ${JSON.stringify(m).slice(0, 400)}`);
      }
    } else {
      console.log('  no GPU/compute/NVIDIA ticker on chain either');
    }
  } catch (err) {
    console.log(`  CHAIN ERROR ${(err as Error)?.message ?? err}`);
  }
}

async function main() {
  await probeIndexer('MAINNET', Network.Mainnet);
  await probeChain('MAINNET', Network.Mainnet);
  await probeIndexer('TESTNET', Network.Testnet);
  console.log('\n=== deep probe complete ===');
}

main().catch((e) => {
  console.error('FATAL', e);
  process.exit(1);
});
