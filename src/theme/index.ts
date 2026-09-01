/**
 * A single light palette, deliberately: the tile logo's ivory-on-indigo is the
 * product's whole visual identity, and a dark variant would either invert the
 * tile or leave it floating. Everything else keys off these values.
 */

export const colors = {
  /** Behind the app column on wide screens — desktop web and tablets. */
  pageEdge: '#171B2E',
  backdrop: '#232946',
  backdropSoft: '#2E3557',
  surface: '#FFFDF7',
  tileFace: '#F4E4C1',
  tileEdge: '#D6BE8F',
  ink: '#1F2440',
  inkSoft: '#5A6079',
  inkFaint: '#9AA0B4',
  hairline: '#E4DECC',
  accent: '#3D5AFE',
  ok: '#1B8A5A',
  okSoft: '#E4F5EC',
  error: '#C0392B',
  errorSoft: '#FBEAE7',
  pending: '#B07A1E',
  pendingSoft: '#FBF2DF',
  locked: '#C8C3B4',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 16,
  pill: 999,
} as const;

export const type = {
  /** Formulas are set slightly wider than body text so ∧ and ∨ stay distinct. */
  formula: {
    fontSize: 17,
    letterSpacing: 0.4,
  },
  formulaSmall: {
    fontSize: 14,
    letterSpacing: 0.3,
  },
} as const;
