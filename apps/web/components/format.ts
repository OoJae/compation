export const usd = (n?: number): string =>
  n == null || Number.isNaN(n)
    ? '—'
    : n.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: Math.abs(n) < 100 ? 2 : 0,
      });

export const num = (n?: number, d = 2): string =>
  n == null || Number.isNaN(n) ? '—' : n.toLocaleString('en-US', { maximumFractionDigits: d });

export const pct = (n?: number): string => (n == null || Number.isNaN(n) ? '—' : `${(n * 100).toFixed(1)}%`);

export const shortHash = (h?: string): string => (h ? `${h.slice(0, 8)}…${h.slice(-6)}` : '');
