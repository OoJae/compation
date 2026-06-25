/**
 * Float-safe quantization helpers. Injective markets enforce discrete price
 * and size increments; we round *toward* the exchange's grid here and nowhere
 * else. A small epsilon absorbs binary-float error (e.g. 3 / 0.001 = 2999.9999).
 */

const EPS = 1e-9;

/** Number of decimal places implied by a step like 0.001 → 3. */
export function decimalsOf(step: number): number {
  if (!isFinite(step) || step <= 0) return 0;
  const s = step.toExponential();
  // s looks like "1e-3" or "2.5e-1"; the exponent tells us the scale.
  const [mantissa, expPart] = s.split('e');
  const exp = parseInt(expPart ?? '0', 10);
  const mantissaDecimals = (mantissa?.split('.')[1] ?? '').length;
  return Math.max(0, mantissaDecimals - exp);
}

function fix(value: number, step: number): number {
  return Number(value.toFixed(Math.min(decimalsOf(step) + 2, 12)));
}

/** Round a value DOWN to the nearest multiple of `step` (e.g. order size). */
export function roundDownToStep(value: number, step: number): number {
  if (step <= 0) return value;
  return fix(Math.floor(value / step + EPS) * step, step);
}

/** Round a value UP to the nearest multiple of `step` (e.g. to reach minNotional). */
export function roundUpToStep(value: number, step: number): number {
  if (step <= 0) return value;
  return fix(Math.ceil(value / step - EPS) * step, step);
}

/** Round a value to the NEAREST multiple of `step` (e.g. a price to its tick). */
export function roundToStep(value: number, step: number): number {
  if (step <= 0) return value;
  return fix(Math.round(value / step) * step, step);
}
