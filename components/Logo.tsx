'use client'

interface LogoProps {
  variant?: 'light' | 'dark'
  size?: 'sm' | 'md' | 'lg'
}

export default function Logo({ variant = 'light', size = 'md' }: LogoProps) {
  const iconSize = size === 'sm' ? 30 : size === 'lg' ? 44 : 36
  const fontSize = size === 'sm' ? '1.1rem' : size === 'lg' ? '1.7rem' : '1.35rem'
  const isDark = variant === 'dark'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
      <svg width={iconSize} height={iconSize} viewBox="0 0 38 38" fill="none">
        <rect width="38" height="38" rx="11" fill={isDark ? '#0d3535' : '#e0f5f5'} />
        <path
          d="M5 19 L11 19 L14 11 L17 24 L20 15 L22 19 L27 19"
          stroke={isDark ? '#5dcfcf' : '#008b8b'}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <circle cx="31" cy="19" r="3" fill="#c5d928" />
      </svg>
      <span style={{
        fontFamily: 'var(--font-serif, serif)',
        fontSize,
        fontWeight: 600,
        color: isDark ? '#fff' : '#1a2e2e',
        letterSpacing: '-0.3px',
        lineHeight: 1,
      }}>
        Triage<span style={{ color: isDark ? '#5dcfcf' : '#008b8b' }}>AI</span>
      </span>
    </div>
  )
}
