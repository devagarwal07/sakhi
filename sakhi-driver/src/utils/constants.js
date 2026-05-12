// Production — all auth goes through the real backend.
// Enable only for local UI testing (skips OTP + backend session).
// Usage: set `EXPO_PUBLIC_DEV_BYPASS_AUTH=true` in the driver app env.
export const DEV_BYPASS_AUTH =
	__DEV__ && String(process.env.EXPO_PUBLIC_DEV_BYPASS_AUTH).toLowerCase() === 'true';
