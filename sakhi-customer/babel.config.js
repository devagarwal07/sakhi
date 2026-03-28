module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      // jsxImportSource handles NativeWind v4 — no separate nativewind/babel plugin needed
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
    ],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@': './src',
            '@components': './src/components',
            '@screens': './src/screens',
            '@context': './src/context',
            '@hooks': './src/hooks',
            '@api': './src/api',
            '@utils': './src/utils',
            '@navigation': './src/navigation',
            '@services': './src/services',
          },
        },
      ],
    ],
  };
};
