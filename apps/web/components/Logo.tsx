/** The Compation geometric mark — a gold bar (+38°) crossing a glowing teal bar (-38°). */
export function Logo({ size = 28, glow = true }: { size?: number; glow?: boolean }) {
  const bar = Math.round(size * 0.57);
  const thick = Math.max(1.4, size * 0.06);
  return (
    <span
      aria-hidden="true"
      style={{
        position: 'relative',
        width: size,
        height: size,
        borderRadius: size * 0.28,
        border: '1.5px solid rgba(236,238,241,0.5)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flex: '0 0 auto',
      }}
    >
      <span style={{ position: 'absolute', width: bar, height: thick, background: '#F5B544', transform: 'rotate(38deg)', borderRadius: 2 }} />
      <span
        style={{
          position: 'absolute',
          width: bar,
          height: thick,
          background: '#34D399',
          transform: 'rotate(-38deg)',
          borderRadius: 2,
          boxShadow: glow ? '0 0 7px rgba(52,211,153,0.7)' : 'none',
        }}
      />
    </span>
  );
}
