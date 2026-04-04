/**
 * Sakhi Driver App — Central Design Tokens
 * Brand: Matches sakhi-customer standard palette
 * Primary: #BEA3D8 (lilac), Background: #F5F0FF, Text: #1E1B2E
 */

export const Colors = {
  // Primary Brand — matches sakhi-customer
  primary: '#BEA3D8',
  primaryContainer: '#BEA3D8',    // lilac — same as customer accent
  primaryLight: '#D4C0E8',
  primaryFixed: '#F5F0FF',
  primaryFixedDim: '#EDE9FA',

  // Secondary
  secondary: '#CCC3D8',
  secondaryContainer: '#EDE9FA',

  // Surfaces — matches customer #F5F0FF base
  background: '#F5F0FF',
  surface: '#F5F0FF',
  surfaceLow: '#F5F0FF',
  surfaceContainer: '#EDE9FA',
  surfaceHigh: '#E8E2F5',
  surfaceHighest: '#E0DAF0',
  surfaceContainerLowest: '#FFFFFF',

  // Online / Success — kept as-is (green states)
  online: '#059669',            // emerald-600 — matches customer verified green
  onlineBg: '#ECFDF5',          // emerald-50  — matches customer verified bg
  onlineDark: '#059669',        // emerald-600

  // Offline
  offline: '#9ca3af',           // gray-400
  offlineBg: '#f3f4f6',         // gray-100

  // Text — matches customer text colors
  onSurface: '#1E1B2E',         // customer primary text
  onSurfaceVariant: '#64748B',  // customer secondary text
  onBackground: '#1E1B2E',
  onPrimary: '#FFFFFF',
  outline: '#94A3B8',
  outlineVariant: '#CCC3D8',    // customer muted/divider

  // Surfaces (extended aliases)
  surfaceContainerLowest: '#FFFFFF',
  surfaceContainerLow:    '#F5F0FF',
  surfaceContainerHigh:   '#E8E2F5',
  surfaceContainerHighest:'#E0DAF0',

  // Semantic
  error: '#BA1A1A',             // matches customer logout/error red
  errorContainer: '#FFDAD6',
  success: '#059669',
  warning: '#f59e0b',

  // Utility
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 48,
};

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  full: 9999,
};

// Alias to match customer-app naming
export const BorderRadius = Radius;

export const Shadows = {
  lavender: {
    shadowColor: 'rgba(124, 58, 237, 1)',  // matches customer shadow color
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 6,
  },
  card: {
    shadowColor: 'rgba(124, 58, 237, 1)',  // matches customer shadow color
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
  },
};

export const Typography = {
  displayLarge:   { fontSize: 40, lineHeight: 48, fontWeight: '800' },
  headline:       { fontSize: 24, lineHeight: 32, fontWeight: '700' },
  headlineSmall:  { fontSize: 20, lineHeight: 28, fontWeight: '700' },
  titleLarge:     { fontSize: 18, lineHeight: 24, fontWeight: '600' },
  titleMedium:    { fontSize: 16, lineHeight: 22, fontWeight: '600' },
  bodyLarge:      { fontSize: 16, lineHeight: 24, fontWeight: '400' },
  bodyMedium:     { fontSize: 14, lineHeight: 20, fontWeight: '400' },
  labelBold:      { fontSize: 12, lineHeight: 16, fontWeight: '700' },
  label:          { fontSize: 12, lineHeight: 16, fontWeight: '500' },
  labelSmall:     { fontSize: 10, lineHeight: 14, fontWeight: '500' },
};

// Gradient presets (for expo-linear-gradient)
export const Gradients = {
  primary:     ['#D4C0E8', '#BEA3D8'],  // customer lilac gradient
  splash:      ['#F5F0FF', '#EDE9FA'],
  lavender:    ['#F5F0FF', '#EDE9FA'],
  surfaceFade: ['rgba(245,240,255,0)', '#F5F0FF'],
};
