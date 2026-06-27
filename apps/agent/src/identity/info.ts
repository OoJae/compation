/**
 * Agent identity & economics — Compation is a real on-chain economic actor: its
 * wallet is the `feeRecipient` on every fill, so it earns Injective protocol fee
 * rebates TODAY (independent of any registration). ERC-8004 registration (the
 * IdentityRegistry is deployed on Injective EVM — verified on-chain) adds a
 * discoverable identity NFT; the token id is shown once registered.
 */
import type { NetworkId } from '@compation/shared';

/** ERC-8004 IdentityRegistry — verified to have code on Injective EVM. */
export const ERC8004_IDENTITY_REGISTRY: Record<NetworkId, string> = {
  testnet: '0x8004A818BFB912233c491871b3d84c89A494BD9e',
  mainnet: '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432',
};

export interface AgentIdentity {
  injAddress: string;
  evmAddress: string;
  network: NetworkId;
  /** The fee recipient set on every order — earns protocol fee rebates. */
  feeRecipient: string;
  earnsFees: boolean;
  erc8004Registry: string;
  erc8004TokenId?: string;
  erc8004TxHash?: string;
  erc8004ExplorerUrl?: string;
}

export function getIdentity(env: NodeJS.ProcessEnv = process.env): AgentIdentity {
  const network: NetworkId = env.COMPATION_ROUTE === 'headline' ? 'mainnet' : 'testnet';
  const injAddress = env.INJECTIVE_WALLET_ADDRESS ?? '';
  const evmAddress = env.INJECTIVE_WALLET_ETH_ADDRESS ?? '';
  const tokenId = env.ERC8004_TOKEN_ID;
  const txHash = env.ERC8004_TX_HASH;
  const explorerBase = network === 'mainnet'
    ? 'https://blockscout.injective.network/tx/'
    : 'https://testnet.blockscout.injective.network/tx/';
  return {
    injAddress,
    evmAddress,
    network,
    feeRecipient: injAddress, // the executor passes this on every MsgCreateDerivativeMarketOrder
    earnsFees: true,
    erc8004Registry: ERC8004_IDENTITY_REGISTRY[network],
    ...(tokenId ? { erc8004TokenId: tokenId } : {}),
    ...(txHash ? { erc8004TxHash: txHash, erc8004ExplorerUrl: explorerBase + txHash } : {}),
  };
}
