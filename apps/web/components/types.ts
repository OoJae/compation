/** Display metadata for the header/badges (client-safe; no secrets). */
export interface AgentMeta {
  model: string;
  executor: string;
  routeKey: string;
  routeLabel: string;
  indexTicker: string;
  venueTicker: string;
  fallbackTicker: string | null;
  proxy: boolean;
}

/** Shapes of the orchestrator tool outputs the UI reads from streamed parts. */
export interface ComputeOutput {
  planId: string;
  ok: boolean;
  proxy: boolean;
  venueKey: string;
  venueTicker: string;
  attempted: string[];
  h100: {
    indexPrice: number;
    exposureHours: number;
    hedgeSize: number;
    notional: number;
    hedgeRatio: number;
    monthlyCarry: number;
  };
  execution: {
    venuePrice: number;
    size: number;
    notional: number;
    margin: number;
    leverage: number;
    estLiquidationPrice: number;
    liquidationBufferPct: number;
    estSlippagePct: number;
    estMonthlyCarry: number;
  } | null;
  bankUsdc: number;
  errors: { code: string; message: string }[];
  warnings: { code: string; message: string }[];
}

export interface PlaceOutput {
  ok: boolean;
  txHash?: string;
  explorerUrl?: string;
  venueKey?: string;
  side?: string;
  size?: number;
  notional?: number;
  margin?: number;
  error?: string;
  errors?: { code: string; message: string }[];
}

/** Loose view of a streamed UIMessage part (text/reasoning/tool-*). */
export interface AnyPart {
  type: string;
  text?: string;
  state?: string;
  output?: unknown;
  input?: unknown;
}
