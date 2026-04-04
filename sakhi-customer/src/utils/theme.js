// Sakhi Design System — Tokens & Utilities
// Source of truth for all colors, typography, spacing used across the app.
// Mirrors the Tailwind config but as JS constants for use in StyleSheet.

export const Colors = {
    // Primary Brand — matches standard sakhi palette
    primary: '#BEA3D8',
    primaryContainer: '#BEA3D8',    // lilac — standard accent
    primaryFixed: '#F5F0FF',
    primaryFixedDim: '#EDE9FA',
    onPrimary: '#FFFFFF',
    onPrimaryContainer: '#EDE9FA',
    inversePrimary: '#D4C0E8',

    secondary: '#CCC3D8',
    secondaryContainer: '#EDE9FA',
    secondaryFixed: '#F5F0FF',
    onSecondary: '#FFFFFF',
    onSecondaryContainer: '#1E1B2E',

    // Surfaces — matches #F5F0FF standard background
    background: '#F5F0FF',
    surface: '#F5F0FF',
    surfaceDim: '#E0DAF0',
    surfaceBright: '#FDFBFF',
    surfaceVariant: '#EDE9FA',
    surfaceContainer: '#EDE9FA',
    surfaceContainerLow: '#F5F0FF',
    surfaceContainerHigh: '#E8E2F5',
    surfaceContainerHighest: '#E0DAF0',
    surfaceContainerLowest: '#FFFFFF',
    inverseSurface: '#1E1B2E',
    inverseOnSurface: '#F5F0FF',

    // Text
    onBackground: '#1E1B2E',
    onSurface: '#1E1B2E',
    onSurfaceVariant: '#64748B',

    outline: '#94A3B8',
    outlineVariant: '#CCC3D8',

    error: '#BA1A1A',
    errorContainer: '#FFDAD6',
    onError: '#FFFFFF',
    onErrorContainer: '#93000A',

    // Convenience aliases
    brandViolet: '#BEA3D8',        // updated to lilac
    brandLavender: '#F5F0FF',
    brandPurpleDark: '#1E1B2E',
    brandGray: '#64748B',

    // Status
    success: '#059669',
    successContainer: '#ECFDF5',
    warning: '#D97706',
    warningContainer: '#FEF3C7',
};

export const Typography = {
    displayLarge: { fontSize: 57, lineHeight: 64, fontWeight: '400' },
    displayMedium: { fontSize: 45, lineHeight: 52, fontWeight: '400' },
    displaySmall: { fontSize: 36, lineHeight: 44, fontWeight: '400' },
    headlineLarge: { fontSize: 32, lineHeight: 40, fontWeight: '700' },
    headlineMedium: { fontSize: 28, lineHeight: 36, fontWeight: '700' },
    headlineSmall: { fontSize: 24, lineHeight: 32, fontWeight: '600' },
    titleLarge: { fontSize: 22, lineHeight: 28, fontWeight: '700' },
    titleMedium: { fontSize: 16, lineHeight: 24, fontWeight: '700' },
    titleSmall: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
    bodyLarge: { fontSize: 16, lineHeight: 24, fontWeight: '400' },
    bodyMedium: { fontSize: 14, lineHeight: 20, fontWeight: '400' },
    bodySmall: { fontSize: 12, lineHeight: 16, fontWeight: '400' },
    labelLarge: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
    labelMedium: { fontSize: 12, lineHeight: 16, fontWeight: '600' },
    labelSmall: { fontSize: 11, lineHeight: 16, fontWeight: '500' },
};

export const Spacing = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
};

export const BorderRadius = {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    full: 9999,
};

export const Shadows = {
    editorial: {
        shadowColor: 'rgba(124, 58, 237, 1)',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 20,
        elevation: 8,
    },
    card: {
        shadowColor: 'rgba(124, 58, 237, 1)',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 12,
        elevation: 4,
    },
    none: {},
};

// Gradient presets (for use with expo-linear-gradient)
export const Gradients = {
    primary: ['#D4C0E8', '#BEA3D8'],  // lilac gradient
    splash: ['#F5F0FF', '#EDE9FA'],
    surfaceFade: ['rgba(245,240,255,0)', '#F5F0FF'],
};
