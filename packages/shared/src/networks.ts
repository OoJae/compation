/**
 * Chain profiles — one per network. The executor resolves gRPC/indexer
 * endpoints from `@injectivelabs/networks` using `networkEnum`; everything
 * the UI needs (explorer links, chain ids) lives here.
 *
 * IMPORTANT: chain id 1776 is **mainnet** (the EVM chain id). The H100 perp
 * exists on mainnet only.
 */

export type NetworkId = 'testnet' | 'mainnet';

export interface ChainProfile {
  network: NetworkId;
  /** Cosmos chain id. */
  chainId: string;
  /** Injective EVM chain id. */
  evmChainId: number;
  /** Maps to the `Network` enum in `@injectivelabs/networks`. */
  networkEnum: 'Mainnet' | 'Testnet';
  /** Append a tx hash to build an explorer URL. */
  explorerTxBase: string;
  faucetUrl?: string;
}

export const CHAINS: Record<NetworkId, ChainProfile> = {
  mainnet: {
    network: 'mainnet',
    chainId: 'injective-1',
    evmChainId: 1776,
    networkEnum: 'Mainnet',
    explorerTxBase: 'https://explorer.injective.network/transaction/',
  },
  testnet: {
    network: 'testnet',
    chainId: 'injective-888',
    evmChainId: 1439,
    networkEnum: 'Testnet',
    explorerTxBase: 'https://testnet.explorer.injective.network/transaction/',
    faucetUrl: 'https://testnet.faucet.injective.network/',
  },
};

/** Build a working block-explorer URL for a tx hash on the given network. */
export function explorerTxUrl(network: NetworkId, txHash: string): string {
  return CHAINS[network].explorerTxBase + txHash;
}
