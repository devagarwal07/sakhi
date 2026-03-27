/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Sakhi Driver Brand Palette
        primary: {
          DEFAULT: '#630ed4',
          50:  '#faf5ff',
          100: '#f3e8ff',
          400: '#a855f7',
          500: '#8b5cf6',  // violet-500
          600: '#7c3aed',  // violet-600
          700: '#630ed4',
          900: '#4c1d95',
        },
        secondary: {
          DEFAULT: '#674bb5',
          container: '#ab8ffe',
        },
        surface: {
          DEFAULT: '#fcf8ff',
          low: '#f6f1ff',
          container: '#f0ecfa',
          high: '#ebe6f5',
          highest: '#e5e0ef',
        },
        // Online / Success
        online: '#10b981',     // emerald-500
        'online-light': '#d1fae5',
        error: {
          DEFAULT: '#ba1a1a',
          container: '#ffdad6',
        },
        // Semantic Mapping
        background: '#fcf8ff',
        'on-surface': '#1c1a25',
        'on-surface-variant': '#4a4455',
        'outline-variant': '#ccc3d8',
        'primary-container': '#7c3aed',
        'surface-container-lowest': '#ffffff',
      },
      fontFamily: {
        headline: ['Inter'],
        body: ['Inter'],
        label: ['Inter'],
      },
      borderRadius: {
        xl: '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
        full: '9999px',
      },
    },
  },
  plugins: [],
};
