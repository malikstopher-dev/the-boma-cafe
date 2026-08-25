// Design tokens — Navy / Violet / Amber Operations Theme
// The Boma Cafe Operations Platform

export const tokens = {
  colors: {
    bg: {
      primary: '#0F172A',
      secondary: '#111827',
      tertiary: '#1B2336',
      inverse: '#F8FAFC',
    },
    surface: {
      default: '#111827',
      raised: '#1B2336',
      overlay: 'rgba(0,0,0,0.6)',
    },
    border: {
      default: '#334155',
      strong: '#475569',
      focus: '#FBBF24',
    },
    text: {
      primary: '#F8FAFC',
      secondary: '#CBD5E1',
      muted: '#94A3B8',
      inverse: '#0F172A',
      link: '#FBBF24',
    },
    accent: {
      default: '#FBBF24',
      hover: '#F59E0B',
      bg: 'rgba(251,191,36,0.10)',
      text: '#FBBF24',
    },
    success: {
      default: '#34D399',
      bg: 'rgba(52,211,153,0.10)',
      text: '#34D399',
    },
    warning: {
      default: '#FBBF24',
      bg: 'rgba(251,191,36,0.10)',
      text: '#FBBF24',
    },
    danger: {
      default: '#E85454',
      bg: 'rgba(232,84,84,0.10)',
      text: '#E85454',
    },
    info: {
      default: '#60A5FA',
      bg: 'rgba(96,165,250,0.10)',
      text: '#60A5FA',
    },
    kitchen: '#4CAF50',
    bar: '#A78BFA',
    waiter: '#FBBF24',
  },

  typography: {
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    fontFamilyDisplay: "'Playfair Display', Georgia, serif",
    fontFamilyMono: "'JetBrains Mono', 'SF Mono', monospace",
    fontSize: {
      xs: '11px',
      sm: '12px',
      base: '14px',
      md: '16px',
      lg: '18px',
      xl: '20px',
      '2xl': '24px',
      '3xl': '28px',
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    lineHeight: {
      tight: 1.2,
      normal: 1.5,
      relaxed: 1.75,
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
    10: '40px',
    12: '48px',
    16: '64px',
  },

  radius: {
    sm: '6px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    full: '9999px',
  },

  shadow: {
    sm: '0 1px 2px rgba(0,0,0,0.15)',
    md: '0 4px 12px rgba(0,0,0,0.25)',
    lg: '0 8px 32px rgba(0,0,0,0.4)',
    xl: '0 16px 64px rgba(0,0,0,0.5)',
  },

  transition: {
    fast: '0.15s ease',
    normal: '0.2s ease',
    slow: '0.3s ease',
  },

  zIndex: {
    card: 1,
    header: 10,
    sidebar: 100,
    modal: 200,
    toast: 300,
    tooltip: 400,
  },
} as const

export type ColorToken = keyof typeof tokens.colors
export type SpacingToken = keyof typeof tokens.spacing
