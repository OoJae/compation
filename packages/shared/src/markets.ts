/**
 * Market registry + hedge routing — the network-switch abstraction, now
 * grounded in Phase 0.1 on-chain reads (June 2026). ONE code path serves every
 * venue; only the active `HedgeRoute` changes.
 *
 * Reality captured by the spike:
 *  - The native `H100/USDT PERP` is **paused** (USDT→USDC migration, May 2026),
 *    so it is NOT tradeable — but its **index price is still live on-chain**
 *    (Squaretower `SQTWR_H100USD` via the Stork oracle, ~$2.85/H100-hour). We
 *    therefore keep H100 as the INDEX (price source + hedge economics) and
 *    execute on an active USDC perp as a transparent PROXY venue, auto-routing
 *    to native H100 the moment it relists (flip the route's indexKey==venueKey).
 *  - Headline execution venue = `NVDA/USDC PERP` (NVIDIA makes the H100;
 *    thematic + active). Fallback for fill reliability = `INJ/USDC PERP`
 *    (deepest book). Both real, both USDC.
 *  - Dev/testing happens on testnet USDC perps. NOTE: testnet books are thin —
 *    repeatable iteration uses the FakeExecutor; testnet is for signing/registry.
 *
 * Value conversions from chain units: humanTick = chainTick / 10^quoteDecimals;
 * humanMinNotional = chainMinNotional / 10^quoteDecimals; quantity tick is
 * already human (contract count). maxLeverage ≈ 1 / initialMarginRatio.
 */

import type { NetworkId } from './networks';

export type MarketStatus = 'active' | 'paused' | 'suspended' | 'expired' | 'demolished';
export type MarketRole = 'index' | 'venue';

export interface MarketProfile {
  key: string;
  network: NetworkId;
  /** Human label for the UI. */
  marketTicker: string;
  /** Symbol the MCP `market_price` tool expects. */
  marketSymbol: string;
  /** 0x… derivative market id. */
  marketId: string;
  quoteDenom: string;
  quoteSymbol: string;
  quoteDecimals: number;
  /** Human price increment. */
  tickSize: number;
  /** Human size increment (contracts). */
  minQuantityTick: number;
  /** Human minimum notional (quote). */
  minNotional: number;
  maxLeverage: number;
  initialMarginRatio: number;
  maintenanceMarginRate: number;
  takerFeeRate: number;
  makerFeeRate: number;
  oracleBase: string;
  oracleQuote: string;
  oracleType: string;
  status: MarketStatus;
  role: MarketRole;
  /** Can we open positions here? (active status with a usable book). */
  tradeable: boolean;
  /** True once values were confirmed by an on-chain read. */
  confirmed: boolean;
}

export const MARKETS: Record<string, MarketProfile> = {
  // ===== INDEX (price source + hedge economics) — read-only, PAUSED =====
  'mainnet:H100': {
    key: 'mainnet:H100',
    network: 'mainnet',
    marketTicker: 'H100/USDT PERP',
    marketSymbol: 'H100',
    marketId: '0x56cb0ef0b9d59125373112523b0adfc446dff989268547fa1a3379a6f98f5efd',
    quoteDenom: 'peggy0xdAC17F958D2ee523a2206206994597C13D831ec7',
    quoteSymbol: 'USDT',
    quoteDecimals: 6,
    tickSize: 0.001,
    minQuantityTick: 0.1,
    minNotional: 1,
    maxLeverage: 5,
    initialMarginRatio: 0.181818,
    maintenanceMarginRate: 0.1,
    takerFeeRate: 0.0005,
    makerFeeRate: 0,
    oracleBase: 'SQTWR_H100USD',
    oracleQuote: 'USDTUSD',
    oracleType: 'stork',
    status: 'paused',
    role: 'index',
    tradeable: false, // paused — index/price source only
    confirmed: true,
  },

  // ===== EXECUTION VENUES (active, USDC) =====
  // Primary headline venue: NVIDIA — the maker of the H100.
  'mainnet:NVDA_USDC': {
    key: 'mainnet:NVDA_USDC',
    network: 'mainnet',
    marketTicker: 'NVDA/USDC PERP',
    marketSymbol: 'NVDA',
    marketId: '0xb9d9202c588e860382c96aee096f9655fce339f6b51833a939a37d2437080c17',
    quoteDenom: 'erc20:0xa00C59fF5a080D2b954d0c75e46E22a0c371235a',
    quoteSymbol: 'USDC',
    quoteDecimals: 6,
    tickSize: 0.01,
    minQuantityTick: 0.001,
    minNotional: 1,
    maxLeverage: 30,
    initialMarginRatio: 0.033333,
    maintenanceMarginRate: 0.02,
    takerFeeRate: 0.000001,
    makerFeeRate: 0.000001,
    oracleBase: 'NVDA/USDC',
    oracleQuote: 'InjectiveLabs',
    oracleType: 'provider',
    status: 'active',
    role: 'venue',
    tradeable: true,
    confirmed: true,
  },
  // Fallback venue for fill reliability: deepest active book.
  'mainnet:INJ_USDC': {
    key: 'mainnet:INJ_USDC',
    network: 'mainnet',
    marketTicker: 'INJ/USDC PERP',
    marketSymbol: 'INJ',
    marketId: '0x790aee464fbbd02cf4476444554c71d1225f7edfe15e6dc7f874c455fd883d31',
    quoteDenom: 'erc20:0xa00C59fF5a080D2b954d0c75e46E22a0c371235a',
    quoteSymbol: 'USDC',
    quoteDecimals: 6,
    tickSize: 0.001,
    minQuantityTick: 0.01,
    minNotional: 1,
    maxLeverage: 30,
    initialMarginRatio: 0.033333,
    maintenanceMarginRate: 0.02,
    takerFeeRate: 0.000001,
    makerFeeRate: 0.000001,
    oracleBase: '0x000344d7a7d81f051ee273a63f94f8bef7d44ca89aa03e0c5bf4d085df19adb6',
    oracleQuote: '0x00038f83323b6b08116d1614cf33a9bd71ab5e0abf0c9f1b783a74a43e7bd992',
    oracleType: 'chainlinkdatastreams',
    status: 'active',
    role: 'venue',
    tradeable: true,
    confirmed: true,
  },
  'mainnet:BTC_USDC': {
    key: 'mainnet:BTC_USDC',
    network: 'mainnet',
    marketTicker: 'BTC/USDC PERP',
    marketSymbol: 'BTC',
    marketId: '0x0ee7ca44147bab6ec81ac293b5fe7915488e612af59964b2d663d6008d861dee',
    quoteDenom: 'erc20:0xa00C59fF5a080D2b954d0c75e46E22a0c371235a',
    quoteSymbol: 'USDC',
    quoteDecimals: 6,
    tickSize: 1,
    minQuantityTick: 0.00001,
    minNotional: 1,
    maxLeverage: 52,
    initialMarginRatio: 0.019231,
    maintenanceMarginRate: 0.01,
    takerFeeRate: 0.000001,
    makerFeeRate: 0.000001,
    oracleBase: '0x00039d9e45394f473ab1f050a1b963e6b05351e52d71e507509ada0c95ed75b8',
    oracleQuote: '0x00038f83323b6b08116d1614cf33a9bd71ab5e0abf0c9f1b783a74a43e7bd992',
    oracleType: 'chainlinkdatastreams',
    status: 'active',
    role: 'venue',
    tradeable: true,
    confirmed: true,
  },

  // ===== TESTNET DEV VENUES (active; thin books — see note above) =====
  'testnet:INJ_USDC': {
    key: 'testnet:INJ_USDC',
    network: 'testnet',
    marketTicker: 'INJ/USDC PERP',
    marketSymbol: 'INJ',
    marketId: '0xdc70164d7120529c3cd84278c98df4151210c0447a65a2aab03459cf328de41e',
    quoteDenom: 'erc20:0x0C382e685bbeeFE5d3d9C29e29E341fEE8E84C5d',
    quoteSymbol: 'USDC',
    quoteDecimals: 6,
    tickSize: 0.001,
    minQuantityTick: 0.01,
    minNotional: 1,
    maxLeverage: 30,
    initialMarginRatio: 0.033333,
    maintenanceMarginRate: 0.02,
    takerFeeRate: 0.0005,
    makerFeeRate: 0,
    oracleBase: '46',
    oracleQuote: '7',
    oracleType: 'pythpro',
    status: 'active',
    role: 'venue',
    tradeable: true,
    confirmed: true,
  },
  'testnet:BTC_USDC': {
    key: 'testnet:BTC_USDC',
    network: 'testnet',
    marketTicker: 'BTC/USDC PERP',
    marketSymbol: 'BTC',
    marketId: '0xfd704649cf3a516c0c145ab0111717c44640d8dbe52a462ae35cadf2f6df1515',
    quoteDenom: 'erc20:0x0C382e685bbeeFE5d3d9C29e29E341fEE8E84C5d',
    quoteSymbol: 'USDC',
    quoteDecimals: 6,
    tickSize: 1,
    minQuantityTick: 0.0001,
    minNotional: 1,
    maxLeverage: 52,
    initialMarginRatio: 0.019231,
    maintenanceMarginRate: 0.01,
    takerFeeRate: 0.0005,
    makerFeeRate: 0,
    oracleBase: '0x00037da06d56d083fe599397a4769a042d63aa73dc4ef57709d31e9971a5b439',
    oracleQuote: '0x0003dc85e8b01946bf9dfd8b0db860129181eb6105a8c8981d9f28e00b6f60d9',
    oracleType: 'chainlinkdatastreams',
    status: 'active',
    role: 'venue',
    tradeable: true,
    confirmed: true,
  },
};

/**
 * A hedge route binds the price source (index) to the execution venue(s).
 * `proxy` is true when index !== primary venue (the H100-paused reality).
 * When H100 relists on USDC, set indexKey === primaryVenueKey to go native.
 */
export interface HedgeRoute {
  key: string;
  label: string;
  network: NetworkId;
  /** Price source for the hedge economics (the H100 index). */
  indexKey: string;
  /** Where orders go first. */
  primaryVenueKey: string;
  /** Auto-route here for fill reliability if the primary book is too thin. */
  fallbackVenueKeys: string[];
  /** Execution venue differs from the index market. */
  proxy: boolean;
}

export const ROUTES: Record<string, HedgeRoute> = {
  // The demo headline: live H100 index → NVDA execution → INJ fallback.
  headline: {
    key: 'headline',
    label: 'H100 index → NVDA/USDC (proxy) → INJ/USDC (fallback)',
    network: 'mainnet',
    indexKey: 'mainnet:H100',
    primaryVenueKey: 'mainnet:NVDA_USDC',
    fallbackVenueKeys: ['mainnet:INJ_USDC'],
    proxy: true,
  },
  // Repeatable dev/signing on testnet (FakeExecutor used for the iteration loop).
  dev: {
    key: 'dev',
    label: 'H100 index → testnet INJ/USDC',
    network: 'testnet',
    indexKey: 'mainnet:H100', // read the live mainnet H100 index even in dev
    primaryVenueKey: 'testnet:INJ_USDC',
    fallbackVenueKeys: [],
    proxy: true,
  },
};

export const DEFAULT_ROUTE_KEY = 'dev';

export function getMarketProfile(key: string): MarketProfile {
  const profile = MARKETS[key];
  if (!profile) {
    throw new Error(`Unknown market key "${key}". Known: ${Object.keys(MARKETS).join(', ')}`);
  }
  return profile;
}

export function getRoute(key: string): HedgeRoute {
  const route = ROUTES[key];
  if (!route) {
    throw new Error(`Unknown route "${key}". Known: ${Object.keys(ROUTES).join(', ')}`);
  }
  return route;
}
