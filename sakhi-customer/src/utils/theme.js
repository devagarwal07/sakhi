// Sakhi Design System — Tokens & Utilities
// Source of truth for all colors, typography, spacing used across the app.
// Mirrors the Tailwind config but as JS constants for use in StyleSheet.

export const Colors = {
    primary: '#630ed4',
    primaryContainer: '#7c3aed',
    primaryFixed: '#eaddff',
    primaryFixedDim: '#d2bbff',
    onPrimary: '#ffffff',
    onPrimaryContainer: '#ede0ff',
    inversePrimary: '#d2bbff',

    secondary: '#674bb5',
    secondaryContainer: '#ab8ffe',
    secondaryFixed: '#e8ddff',
    onSecondary: '#ffffff',
    onSecondaryContainer: '#3f1e8c',

    background: '#fcf8ff',
    surface: '#fcf8ff',
    surfaceDim: '#dcd8e6',
    surfaceBright: '#fcf8ff',
    surfaceVariant: '#e5e0ef',
    surfaceContainer: '#f0ecfa',
    surfaceContainerLow: '#f6f1ff',
    surfaceContainerHigh: '#ebe6f5',
    surfaceContainerHighest: '#e5e0ef',
    surfaceContainerLowest: '#ffffff',
    inverseSurface: '#312f3a',
    inverseOnSurface: '#f3eefd',

    onBackground: '#1c1a25',
    onSurface: '#1c1a25',
    onSurfaceVariant: '#4a4455',

    outline: '#7b7487',
    outlineVariant: '#ccc3d8',

    error: '#ba1a1a',
    errorContainer: '#ffdad6',
    onError: '#ffffff',
    onErrorContainer: '#93000a',

    // Convenience
    brandViolet: '#7c3aed',
    brandLavender: '#F5F0FF',
    brandPurpleDark: '#1E1B2E',
    brandGray: '#6B7280',

    // Status
    success: '#16a34a',
    successContainer: '#dcfce7',
    warning: '#d97706',
    warningContainer: '#fef3c7',
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
        shadowColor: '#7c3aed',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
        elevation: 8,
    },
    card: {
        shadowColor: '#1c1a25',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 4,
    },
    none: {},
};

// Gradient presets (for use with expo-linear-gradient)
export const Gradients = {
    primary: ['#7C3AED', '#630ED4'],
    splash: ['#F5F0FF', '#EDE9FE'],
    surfaceFade: ['rgba(252,248,255,0)', '#fcf8ff'],
};
