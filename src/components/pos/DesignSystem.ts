// POS Design System — Dark theme tokens for Kitchen/Bar/Waiter displays
// Based on MiniMax M3 redesign plan — Square/Toast/Lightspeed aesthetic

export const posTokens = {
  colors: {
    bg: {
      primary: '#0a0a14',
      surface: '#121220',
      card: '#1a1a2e',
      cardHover: '#22223a',
      elevated: '#24243c',
    },
    border: {
      default: 'rgba(255,255,255,0.08)',
      strong: 'rgba(255,255,255,0.12)',
      focus: 'rgba(255,255,255,0.2)',
    },
    text: {
      primary: '#F8F9FB',
      secondary: 'rgba(255,255,255,0.7)',
      muted: 'rgba(255,255,255,0.5)',
      dim: 'rgba(255,255,255,0.35)',
    },
    status: {
      pending: '#f59e0b',
      confirmed: '#3b82f6',
      preparing: '#eab308',
      packing: '#f97316',
      ready: '#10b981',
      served: '#06b6d4',
      completed: '#6b7280',
      cancelled: '#ef4444',
      rejected: '#ef4444',
    },
    station: {
      kitchen: '#f59e0b',
      kitchenBg: 'rgba(245,158,11,0.12)',
      bar: '#8b5cf6',
      barBg: 'rgba(139,92,246,0.12)',
    },
    accent: {
      orange: '#f59e0b',
      green: '#10b981',
      red: '#ef4444',
      blue: '#3b82f6',
      purple: '#8b5cf6',
    },
  },
  typography: {
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    fontFamilyMono: "'JetBrains Mono', 'SF Mono', 'Fira Code', monospace",
    fontSize: {
      xs: '11px',
      sm: '12px',
      base: '13px',
      md: '14px',
      lg: '16px',
      xl: '20px',
      '2xl': '24px',
      '3xl': '32px',
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      extrabold: 800,
    },
  },
  spacing: {
    1: '4px',
    2: '8px',
    3: '12px',
    4: '16px',
    5: '20px',
    6: '24px',
    8: '32px',
  },
  radius: {
    sm: '6px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    full: '9999px',
  },
  shadow: {
    sm: '0 2px 8px rgba(0,0,0,0.3)',
    md: '0 4px 16px rgba(0,0,0,0.4)',
    lg: '0 8px 32px rgba(0,0,0,0.5)',
  },
  transition: {
    fast: '0.15s ease',
    normal: '0.2s ease',
    slow: '0.3s ease',
  },
} as const
