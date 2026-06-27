import { describe, it, expect } from 'vitest';
import {
  assessExposureSchema,
  computeHedgeSchema,
  placeHedgeSchema,
  summarizeSchema,
} from './tools.js';

/** Words that would let the model inject a position size — must NOT appear as inputs. */
const FORBIDDEN = ['size', 'notional', 'margin', 'quantity', 'contracts'];

const keysOf = (schema: { shape: Record<string, unknown> }) => Object.keys(schema.shape);

describe('size-proof tool schemas', () => {
  it('NO tool input carries a size/notional/margin/quantity field', () => {
    for (const schema of [assessExposureSchema, computeHedgeSchema, placeHedgeSchema, summarizeSchema]) {
      for (const key of keysOf(schema)) {
        expect(FORBIDDEN).not.toContain(key.toLowerCase());
      }
    }
  });

  it('place_hedge input is EXACTLY { planId } (a server-held reference, not numbers)', () => {
    expect(keysOf(placeHedgeSchema)).toEqual(['planId']);
  });

  it('assess_exposure carries only user-intent params', () => {
    expect(keysOf(assessExposureSchema).sort()).toEqual(
      [
        'hedgeRatio',
        'horizonMonths',
        'leverage',
        'liquidationBufferMin',
        'maxSlippage',
        'monthlyHours',
        'monthlySpendQuote',
      ].sort(),
    );
  });

  it('compute_hedge and summarize take no model-supplied numbers', () => {
    expect(keysOf(computeHedgeSchema)).toEqual([]);
    expect(keysOf(summarizeSchema)).toEqual([]);
  });
});
