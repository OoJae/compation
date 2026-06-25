/**
 * Cross-cutting constants shared by the agent and the web app.
 * Pure values only — no I/O, no environment reads.
 */

/** Hours in an average month (365.25 * 24 / 12). Used for funding-carry math. */
export const HOURS_PER_MONTH = 730;

/**
 * Default risk parameters. Every one of these is overridable per request;
 * these are the safe fallbacks the orchestrator starts from.
 */
export const DEFAULTS = {
  /** h — partial hedge ratio (0 < h <= 1). */
  hedgeRatio: 0.8,
  /** Minimum distance the entry must keep from the liquidation price (fraction). */
  liquidationBufferMin: 0.4,
  /** Default leverage. Note: a 40% liq-buffer caps usable leverage near ~2.5x. */
  leverage: 2,
  /** Market max leverage fallback when a profile does not specify one. */
  maxLeverageFallback: 5,
  /** Slippage tolerance as a fraction (50 bps). */
  slippageTolerance: 0.005,
  /** Default hedge horizon in months. */
  horizonMonths: 1,
} as const;
