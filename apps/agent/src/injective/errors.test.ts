import { describe, it, expect } from 'vitest';
import { normalizeExecutionError, friendlyTurnError, isUncertainExecutionError } from './errors';
import { MainnetWriteBlocked } from './types';

describe('normalizeExecutionError', () => {
  it('maps the mainnet gate', () => {
    const fe = normalizeExecutionError(new MainnetWriteBlocked('mainnet:NVDA_USDC'));
    expect(fe.code).toBe('MAINNET_GATED');
  });

  it('maps insufficient balance', () => {
    const fe = normalizeExecutionError(new Error('insufficient funds to post margin'));
    expect(fe.code).toBe('INSUFFICIENT_BALANCE');
  });

  it('maps thin-liquidity / orderbook errors', () => {
    const fe = normalizeExecutionError(new Error('orderbook liquidity cannot satisfy the order'));
    expect(fe.code).toBe('THIN_LIQUIDITY');
  });

  it('maps transient RPC failures', () => {
    expect(normalizeExecutionError(new Error('fetch failed')).code).toBe('RPC_HICCUP');
    expect(normalizeExecutionError(new Error('context deadline exceeded')).code).toBe('RPC_HICCUP');
  });

  it('falls back generically and never leaks the raw message', () => {
    const fe = normalizeExecutionError(new Error('panic: 0xdeadbeef nil pointer'));
    expect(fe.code).toBe('EXECUTION_FAILED');
    expect(fe.message).not.toContain('0xdeadbeef');
  });
});

describe('friendlyTurnError', () => {
  it('flags an Azure/model outage', () => {
    expect(friendlyTurnError(new Error('Azure deployment not found'))).toMatch(/Azure/i);
  });

  it('flags a missing wallet', () => {
    expect(friendlyTurnError(new Error('INJECTIVE_PRIVATE_KEY missing — run wallet:gen'))).toMatch(/wallet/i);
  });

  it('has a safe generic default', () => {
    expect(friendlyTurnError(new Error('weird internal thing'))).toMatch(/try again/i);
  });
});

describe('isUncertainExecutionError', () => {
  it('flags codes where the broadcast may have landed (worth reconciling)', () => {
    expect(isUncertainExecutionError('RPC_HICCUP')).toBe(true);
    expect(isUncertainExecutionError('EXECUTION_FAILED')).toBe(true);
  });
  it('does not flag codes that definitely never submitted', () => {
    expect(isUncertainExecutionError('INSUFFICIENT_BALANCE')).toBe(false);
    expect(isUncertainExecutionError('THIN_LIQUIDITY')).toBe(false);
    expect(isUncertainExecutionError('MAINNET_GATED')).toBe(false);
  });
});
