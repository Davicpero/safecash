import { useId } from 'react';

/**
 * Logo SafeCash: escudo (segurança) + cifrão em traço único (dinheiro).
 * variant="light" para fundos escuros (sidebar), "dark" para fundos claros.
 */
export function LogoMark({ size = 36 }) {
  const gradientId = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#14b8a6" />
          <stop offset="1" stopColor="#0f766e" />
        </linearGradient>
      </defs>
      <path d="M32 3 8 11v19c0 15.6 10.2 26.4 24 31 13.8-4.6 24-15.4 24-31V11L32 3Z" fill={`url(#${gradientId})`} />
      <path
        d="M41.5 22.5c-2-2.6-5.4-4-9.4-4-5.6 0-9.3 2.9-9.3 7 0 4.4 3.8 5.9 9 7 4.6 1 6.6 1.9 6.6 4 0 2.1-2.3 3.5-5.9 3.5-3.4 0-6.3-1.3-8.2-3.6"
        fill="none" stroke="#fff" strokeWidth="4.4" strokeLinecap="round"
      />
      <path d="M32 13.5v5M32 41v5.5" stroke="#fff" strokeWidth="4.4" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ size = 36, variant = 'dark' }) {
  return (
    <span className={`logo logo--${variant}`} aria-label="SafeCash">
      <LogoMark size={size} />
      <span className="logo__word" style={{ fontSize: size * 0.58 }}>
        Safe<strong>Cash</strong>
      </span>
    </span>
  );
}
