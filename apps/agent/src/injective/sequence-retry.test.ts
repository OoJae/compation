import { describe, it, expect, vi } from 'vitest';
import { withSequenceRetry } from './sdk-executor';

describe('withSequenceRetry', () => {
  it('retries once on an account-sequence-mismatch, then succeeds', async () => {
    let calls = 0;
    const fn = vi.fn(async () => {
      calls++;
      if (calls === 1) throw new Error('account sequence mismatch, expected 5, got 4');
      return 'ok';
    });
    await expect(withSequenceRetry(fn)).resolves.toBe('ok');
    expect(calls).toBe(2);
  });

  it('does NOT retry a non-sequence error', async () => {
    let calls = 0;
    const fn = async () => {
      calls++;
      throw new Error('insufficient funds for margin');
    };
    await expect(withSequenceRetry(fn)).rejects.toThrow('insufficient funds');
    expect(calls).toBe(1);
  });
});
