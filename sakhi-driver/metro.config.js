const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Metro (Expo SDK 50+) resolves package.json `exports` field by default,
// which picks react-i18next's ES module build (dist/es/) that uses bare
// specifiers Metro can't handle. Disabling it makes Metro fall back to the
// `main` field, which correctly points to the CJS build.
config.resolver.unstable_enablePackageExports = false;

module.exports = withNativeWind(config, { input: './global.css' });


