/**
 * The real execution path: @injectivelabs/sdk-ts. Trades from the DEFAULT
 * subaccount (index 0) drawing margin straight from bank USDC (no deposit —
 * verified Phase 0.2). Reads use the plain network endpoints; writes use the
 * Sentry broadcaster. Mainnet writes are hard-gated behind ALLOW_MAINNET_WRITES.
 */
import Decimal from 'decimal.js';
import {
  PrivateKey,
  MsgBroadcasterWithPk,
  MsgCreateDerivativeMarketOrder,
  IndexerGrpcDerivativesApi,
  IndexerGrpcOracleApi,
  ChainGrpcBankApi,
} from '@injectivelabs/sdk-ts';
import { getNetworkEndpoints, Network } from '@injectivelabs/networks';
import { getMarketProfile, explorerTxUrl, type MarketProfile, type NetworkId } from '@compation/shared';
import type { OrderbookDepth } from '../risk/index';
import { chainSellsToDepth } from './adapters';
import { humanPriceToChain, humanQtyToChain } from './scaling';
import {
  MainnetWriteBlocked,
  type InjectiveExecutor,
  type VenueQuote,
  type OnChainPosition,
  type OpenResult,
  type CloseResult,
  type QuantizedOrder,
} from './types';

interface ReadClients {
  deriv: IndexerGrpcDerivativesApi;
  oracle: IndexerGrpcOracleApi;
  bank: ChainGrpcBankApi;
}

const CLOSE_SLIPPAGE = 0.01;

/**
 * Retry an IDEMPOTENT read a few times on a transient RPC blip (so one flaky
 * testnet gRPC call doesn't abort a whole hedge turn). NEVER wrap a broadcast —
 * writes are not idempotent.
 */
async function withRetry<T>(fn: () => Promise<T>, tries = 3, baseMs = 250): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (i < tries - 1) await new Promise((r) => setTimeout(r, baseMs * (i + 1)));
    }
  }
  throw lastErr;
}

export class SdkExecutor implements InjectiveExecutor {
  readonly kind = 'sdk' as const;
  private readonly pk: PrivateKey;
  private readonly address: string;
  private readonly subaccountId: string;
  private readonly allowMainnet: boolean;
  private readonly reads = new Map<NetworkId, ReadClients>();
  private readonly broadcasters = new Map<NetworkId, MsgBroadcasterWithPk>();

  constructor(env: NodeJS.ProcessEnv = process.env) {
    const hex = env.INJECTIVE_PRIVATE_KEY;
    if (!hex) throw new Error('INJECTIVE_PRIVATE_KEY missing — run wallet:gen');
    this.pk = PrivateKey.fromHex(hex);
    this.address = this.pk.toAddress().toAccountAddress();
    this.subaccountId = this.pk.toAddress().getSubaccountId(0); // default subaccount = bank balance
    this.allowMainnet = env.ALLOW_MAINNET_WRITES === 'true';
  }

  private clients(network: NetworkId): ReadClients {
    let c = this.reads.get(network);
    if (!c) {
      const ep = getNetworkEndpoints(network === 'mainnet' ? Network.Mainnet : Network.Testnet);
      c = {
        deriv: new IndexerGrpcDerivativesApi(ep.indexer),
        oracle: new IndexerGrpcOracleApi(ep.indexer),
        bank: new ChainGrpcBankApi(ep.grpc),
      };
      this.reads.set(network, c);
    }
    return c;
  }

  private broadcaster(network: NetworkId): MsgBroadcasterWithPk {
    let b = this.broadcasters.get(network);
    if (!b) {
      b = new MsgBroadcasterWithPk({
        network: network === 'mainnet' ? Network.MainnetSentry : Network.TestnetSentry,
        privateKey: this.pk,
        simulateTx: true,
        gasBufferCoefficient: 1.3,
      });
      this.broadcasters.set(network, b);
    }
    return b;
  }

  private async oraclePrice(p: MarketProfile): Promise<number> {
    const r = (await withRetry(() =>
      this.clients(p.network).oracle.fetchOraclePriceNoThrow({
        baseSymbol: p.oracleBase,
        quoteSymbol: p.oracleQuote,
        oracleType: p.oracleType,
      } as never),
    )) as { price?: string };
    const price = Number(r?.price ?? 0);
    return Number.isFinite(price) && price > 0 ? price : 0;
  }

  async getIndexPrice(indexKey: string): Promise<number> {
    return this.oraclePrice(getMarketProfile(indexKey));
  }

  async getVenue(venueKey: string): Promise<VenueQuote> {
    const p = getMarketProfile(venueKey);
    const price = await this.oraclePrice(p);
    let fundingRateHourly = 0;
    try {
      const f = (await this.clients(p.network).deriv.fetchFundingRates({ marketId: p.marketId })) as {
        fundingRates?: { rate: string }[];
      };
      fundingRateHourly = Number(f.fundingRates?.[0]?.rate ?? 0);
    } catch {
      /* funding optional */
    }
    return { price, fundingRateHourly };
  }

  async getOrderbookDepth(venueKey: string): Promise<OrderbookDepth> {
    const p = getMarketProfile(venueKey);
    const ob = (await withRetry(() => this.clients(p.network).deriv.fetchOrderbookV2(p.marketId))) as {
      sells?: { price: string; quantity: string }[];
    };
    return chainSellsToDepth(ob.sells ?? [], p.quoteDecimals);
  }

  async getBankBalance(venueKey: string): Promise<number> {
    const p = getMarketProfile(venueKey);
    const bal = (await withRetry(() =>
      this.clients(p.network).bank.fetchBalance({
        accountAddress: this.address,
        denom: p.quoteDenom,
      }),
    )) as { amount?: string };
    return new Decimal(bal.amount ?? '0').div(new Decimal(10).pow(p.quoteDecimals)).toNumber();
  }

  async getPosition(venueKey: string): Promise<OnChainPosition | null> {
    const p = getMarketProfile(venueKey);
    const res = (await withRetry(() =>
      this.clients(p.network).deriv.fetchPositionsV2({
        subaccountId: this.subaccountId,
        marketIds: [p.marketId],
      } as never),
    )) as { positions?: RawPosition[] };
    const pos = (res.positions ?? []).find((x) => x.marketId === p.marketId);
    if (!pos) return null;
    const scale = new Decimal(10).pow(p.quoteDecimals);
    const entry = new Decimal(pos.entryPrice).div(scale).toNumber();
    const mark = new Decimal(pos.markPrice ?? pos.entryPrice).div(scale).toNumber();
    const qty = Number(pos.quantity);
    const dir = pos.direction === 'long' ? 1 : -1;
    return {
      marketId: pos.marketId,
      subaccountId: pos.subaccountId,
      direction: pos.direction,
      quantity: qty,
      entryPrice: entry,
      margin: new Decimal(pos.margin).div(scale).toNumber(),
      liquidationPrice: new Decimal(pos.liquidationPrice ?? '0').div(scale).toNumber(),
      markPrice: mark,
      unrealizedPnl: (mark - entry) * qty * dir,
    };
  }

  async openHedge(venueKey: string, order: QuantizedOrder): Promise<OpenResult> {
    const p = getMarketProfile(venueKey);
    this.guardWrite(p);
    const msg = MsgCreateDerivativeMarketOrder.fromJSON({
      marketId: p.marketId,
      subaccountId: this.subaccountId,
      injectiveAddress: this.address,
      orderType: order.orderType,
      price: order.chainPrice,
      margin: order.chainMargin,
      quantity: order.chainQuantity,
      feeRecipient: this.address, // protocol fees accrue to the agent wallet
    });
    const res = (await this.broadcaster(p.network).broadcast({
      msgs: [msg],
      memo: `compation open ${venueKey}`,
    })) as { txHash: string; code?: number; rawLog?: string };
    this.assertOk(res);
    return { txHash: res.txHash, explorerUrl: explorerTxUrl(p.network, res.txHash), venueKey, order };
  }

  async closeHedge(venueKey: string): Promise<CloseResult> {
    const p = getMarketProfile(venueKey);
    this.guardWrite(p);
    const pos = await this.getPosition(venueKey);
    if (!pos) throw new Error(`no open position on ${venueKey} to close`);
    const venue = await this.getVenue(venueKey);
    const closeType = pos.direction === 'long' ? 2 : 1; // opposite side
    const padded =
      pos.direction === 'long' ? venue.price * (1 - CLOSE_SLIPPAGE) : venue.price * (1 + CLOSE_SLIPPAGE);
    const msg = MsgCreateDerivativeMarketOrder.fromJSON({
      marketId: p.marketId,
      subaccountId: this.subaccountId,
      injectiveAddress: this.address,
      orderType: closeType,
      price: humanPriceToChain(padded, p.quoteDecimals, p.tickSize),
      margin: '0', // reduce-only
      quantity: humanQtyToChain(pos.quantity, p.minQuantityTick),
      feeRecipient: this.address,
    });
    const res = (await this.broadcaster(p.network).broadcast({
      msgs: [msg],
      memo: `compation close ${venueKey}`,
    })) as { txHash: string; code?: number; rawLog?: string };
    this.assertOk(res);
    return { txHash: res.txHash, explorerUrl: explorerTxUrl(p.network, res.txHash), venueKey };
  }

  private guardWrite(p: MarketProfile): void {
    if (p.network === 'mainnet' && !this.allowMainnet) throw new MainnetWriteBlocked(p.key);
  }

  private assertOk(res: { code?: number; rawLog?: string; txHash: string }): void {
    if (res.code !== undefined && res.code !== 0) {
      throw new Error(`tx ${res.txHash} failed (code ${res.code}): ${res.rawLog ?? ''}`);
    }
  }
}

interface RawPosition {
  marketId: string;
  subaccountId: string;
  direction: 'long' | 'short';
  quantity: string;
  entryPrice: string;
  margin: string;
  liquidationPrice?: string;
  markPrice?: string;
}
