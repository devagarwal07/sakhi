/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './App.{js,jsx,ts,tsx}',
        './src/**/*.{js,jsx,ts,tsx}',
        './app/**/*.{js,jsx,ts,tsx}',
    ],
    presets: [require('nativewind/preset')],
    theme: {
        extend: {
            colors: {
                // Sakhi Brand — Violet/Lavender Design System (matches Stitch HTML screens exactly)
                primary: '#630ed4',
                'primary-container': '#7c3aed',
                'primary-fixed': '#eaddff',
                'primary-fixed-dim': '#d2bbff',
                'on-primary': '#ffffff',
                'on-primary-container': '#ede0ff',
                'on-primary-fixed': '#25005a',
                'on-primary-fixed-variant': '#5a00c6',
                'inverse-primary': '#d2bbff',

                secondary: '#674bb5',
                'secondary-container': '#ab8ffe',
                'secondary-fixed': '#e8ddff',
                'secondary-fixed-dim': '#cebdff',
                'on-secondary': '#ffffff',
                'on-secondary-container': '#3f1e8c',
                'on-secondary-fixed': '#21005e',
                'on-secondary-fixed-variant': '#4f319c',

                tertiary: '#7d3d00',
                'tertiary-container': '#a15100',
                'tertiary-fixed': '#ffdcc6',
                'tertiary-fixed-dim': '#ffb784',
                'on-tertiary': '#ffffff',
                'on-tertiary-container': '#ffe0cd',
                'on-tertiary-fixed': '#301400',
                'on-tertiary-fixed-variant': '#713700',

                background: '#fcf8ff',
                surface: '#fcf8ff',
                'surface-dim': '#dcd8e6',
                'surface-bright': '#fcf8ff',
                'surface-variant': '#e5e0ef',
                'surface-tint': '#732ee4',
                'surface-container': '#f0ecfa',
                'surface-container-low': '#f6f1ff',
                'surface-container-high': '#ebe6f5',
                'surface-container-highest': '#e5e0ef',
                'surface-container-lowest': '#ffffff',
                'inverse-surface': '#312f3a',
                'inverse-on-surface': '#f3eefd',

                'on-background': '#1c1a25',
                'on-surface': '#1c1a25',
                'on-surface-variant': '#4a4455',

                outline: '#7b7487',
                'outline-variant': '#ccc3d8',

                error: '#ba1a1a',
                'error-container': '#ffdad6',
                'on-error': '#ffffff',
                'on-error-container': '#93000a',

                // Convenience aliases
                'brand-violet': '#7c3aed',
                'brand-lavender': '#F5F0FF',
                'brand-purple-dark': '#1E1B2E',
            },
            fontFamily: {
                headline: ['Inter_700Bold'],
                body: ['Inter_400Regular'],
                label: ['Inter_500Medium'],
                poppins: ['Poppins_600SemiBold'],
            },
        },
    },
    plugins: [],
};
