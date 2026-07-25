export const pdfTheme = {
  colors: {
    primary: '#C26A2D',
    primaryHover: '#A65A1F',
    primarySoft: '#D9A066',
    dark: '#1A0F0A',
    darkBrown: '#2C1810',
    darkBrownLight: '#3D2317',
    beige: '#F5EDE3',
    beigeLight: '#EFE4D6',
    beigeDark: '#E6D3B3',
    cream: '#F5E6D3',
    creamDark: '#E8D5C4',
    gold: '#C9A962',
    goldLight: '#E5D4A1',
    heading: '#1F1F1F',
    body: '#4B4033',
    muted: '#7A6A58',
    textOnDark: '#FFF8EF',
    textGold: '#C46B2C',
    white: '#FFFFFF',
    border: '#E6D3B3',
    success: '#2E7D32',
    danger: '#C0392B',
    surface: '#FDF8F3',
    overlay: 'rgba(31, 23, 18, 0.38)',
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
    page: 40,
  },

  typography: {
    display: {
      family: 'Helvetica',
      weights: {
        regular: 400,
        semibold: 600,
        bold: 700,
      },
    },
    body: {
      family: 'Helvetica',
      weights: {
        regular: 400,
        medium: 500,
        semibold: 600,
      },
    },
    sizes: {
      xs: 7,
      sm: 8,
      md: 9,
      base: 10,
      lg: 11,
      xl: 14,
      xxl: 18,
      xxxl: 22,
      hero: 28,
    },
    letterSpacing: {
      tight: -0.5,
      normal: 0,
      wide: 0.5,
      wider: 1,
      widest: 2,
    },
  },

  radius: {
    sm: 4,
    md: 8,
    lg: 12,
    full: 9999,
  },

  watermark: {
    text: 'THE BOMA CAFÉ – CONFIDENTIAL',
    opacity: 0.04,
    fontSize: 48,
    rotation: -45,
  },
} as const

export type PdfTheme = typeof pdfTheme
