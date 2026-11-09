/* Logotipo: isotipo + nombre. Ajusta tamaño con la prop size. */
export default function Logo({ size = 32 }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
        <defs>
          <linearGradient id="logo-g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#7c6cff" />
            <stop offset="1" stopColor="#22d3ee" />
          </linearGradient>
        </defs>
        <rect width="32" height="32" rx="9" fill="url(#logo-g)" />
        <path
          d="M9 21l5-10 4 7 2-3 3 6"
          fill="none"
          stroke="#fff"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span
        style={{
          fontFamily: 'var(--font-heading)',
          fontWeight: 700,
          fontSize: '1.15rem',
          letterSpacing: '-0.02em',
        }}
      >
        Automatiza<span style={{ color: 'var(--color-accent)' }}>360</span>
      </span>
    </span>
  );
}
