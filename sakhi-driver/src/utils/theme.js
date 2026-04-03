/**
 * Sakhi Driver App — Central Design Tokens
 * Brand: Violet-600 primary, Emerald-500 for online/success states
 */

export const Colors = {
  // Primary Brand
  primary: '#630ed4',
  primaryContainer: '#7c3aed',    // violet-600
  primaryLight: '#a855f7',
  primaryFixed: '#eaddff',
  primaryFixedDim: '#d2bbff',

  // Secondary
  secondary: '#674bb5',
  secondaryContainer: '#ab8ffe',

  // Surfaces
  background: '#fcf8ff',
  surface: '#fcf8ff',
  surfaceLow: '#f6f1ff',
  surfaceContainer: '#f0ecfa',
  surfaceHigh: '#ebe6f5',
  surfaceHighest: '#e5e0ef',
  surfaceContainerLowest: '#ffffff',

  // Online / Success
  online: '#10b981',        // emerald-500
  onlineBg: '#d1fae5',      // emerald-100
  onlineDark: '#059669',    // emerald-600

  // Offline
  offline: '#9ca3af',       // gray-400
  offlineBg: '#f3f4f6',    // gray-100

  // Text
  onSurface: '#1c1a25',
  onSurfaceVariant: '#4a4455',
  onBackground: '#1c1a25',
  onPrimary: '#ffffff',
  outline: '#7b7487',
  outlineVariant: '#ccc3d8',

  // Surfaces (extended aliases for customer-pattern compatibility)
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow:    '#f6f1ff',
  surfaceContainerHigh:   '#ebe6f5',
  surfaceContainerHighest:'#e5e0ef',

  // Semantic
  error: '#ba1a1a',
  errorContainer: '#ffdad6',
  success: '#10b981',
  warning: '#f59e0b',

  // Utility
  white: '#ffffff',
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
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
    elevation: 6,
  },
  card: {
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
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
  primary:     ['#BEA3D8', '#7C3AED'],
  splash:      ['#F5F0FF', '#EDE9FE'],
  lavender:    ['#F0ECFA', '#E8E3F5'],
  surfaceFade: ['rgba(245,240,255,0)', '#F5F0FF'],
};
