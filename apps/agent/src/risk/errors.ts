/**
 * Typed risk errors. `PlanError` codes are the constraint violations the
 * engine refuses to place; `HedgeInputError` is a bad-input guard (the
 * orchestrator validates inputs with Zod, so it should rarely surface).
 */

export type PlanErrorCode =
  | 'InsufficientMargin'
  | 'ExceedsLeverage'
  | 'TooThinLiquidity'
  | 'LiquidationBufferTooClose';

export class PlanError extends Error {
  constructor(
    public readonly code: PlanErrorCode,
    message: string,
    public readonly detail: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = 'PlanError';
  }
}

export class HedgeInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HedgeInputError';
  }
}
