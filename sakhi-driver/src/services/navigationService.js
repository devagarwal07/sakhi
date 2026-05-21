'use strict';

/**
 * navigationService.js
 *
 * Pure Expo/Linking navigation launcher.
 * Supports Google Maps (primary), Waze, and browser fallback.
 * No Google Maps SDK. No paid APIs. Zero native code.
 *
 * Usage:
 *   import navigationService from '../services/navigationService';
 *   await navigationService.openGoogleMaps({ lat: 28.61, lng: 77.20 });
 */

import { Linking, Platform } from 'react-native';

// ── Transport mode constants ────────────────────────────────────────────────
export const NAV_MODE = {
  DRIVING: 'd',
  WALKING: 'w',
  BIKE:    'b',  // Not natively supported by Google Maps intent — falls back to d
  TWO_WHEELER: 'd', // Alias for Indian ride-hailing context
};

// ── Deep-link URL schemes ────────────────────────────────────────────────────
const SCHEMES = {
  googleMaps: {
    android: 'google.navigation:',
    // canOpenURL check scheme (just the scheme prefix)
    check:   'comgooglemaps://',
  },
  waze: {
    android: 'waze://',
    check:   'waze://',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validate that lat/lng are real finite numbers in valid ranges.
 */
export function isValidCoords(lat, lng) {
  if (lat == null || lng == null) return false;
  const la = Number(lat);
  const lo = Number(lng);
  return (
    Number.isFinite(la) && Number.isFinite(lo) &&
    la >= -90  && la <= 90 &&
    lo >= -180 && lo <= 180 &&
    !(la === 0 && lo === 0)   // reject null island
  );
}

/**
 * Attempt to open a URL and catch failures gracefully.
 * Returns true if Linking.openURL resolved, false otherwise.
 */
async function tryOpenURL(url) {
  try {
    const supported = await Linking.canOpenURL(url);
    if (!supported) return false;
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check whether Google Maps is installed on the device.
 * @returns {Promise<boolean>}
 */
export async function isGoogleMapsInstalled() {
  try {
    // On Android: use the navigation intent scheme directly
    return await Linking.canOpenURL('google.navigation:q=0,0');
  } catch {
    return false;
  }
}

/**
 * Check whether Waze is installed on the device.
 * @returns {Promise<boolean>}
 */
export async function isWazeInstalled() {
  try {
    return await Linking.canOpenURL('waze://');
  } catch {
    return false;
  }
}

/**
 * Build a Google Maps navigation deep-link URI.
 *
 * Uses the Android geo intent format:
 *   google.navigation:q=LAT,LNG&mode=d
 *
 * @param {object} options
 * @param {number} options.lat  - Destination latitude
 * @param {number} options.lng  - Destination longitude
 * @param {string} [options.mode='d']   - 'd' driving | 'w' walking
 * @param {string} [options.label]      - Optional place label
 * @returns {string}
 */
export function buildGoogleMapsNavURL({ lat, lng, mode = 'd', label }) {
  let url = `google.navigation:q=${lat},${lng}&mode=${mode}`;
  if (label) url += `&label=${encodeURIComponent(label)}`;
  return url;
}

/**
 * Build a Google Maps browser-fallback URL (works on any device).
 */
export function buildGoogleMapsBrowserURL({ lat, lng, mode = 'driving', label }) {
  const modeMap = { d: 'driving', w: 'walking', b: 'driving' };
  const travelMode = modeMap[mode] || 'driving';
  let url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=${travelMode}`;
  if (label) url += `&destination_place_id=${encodeURIComponent(label)}`;
  return url;
}

/**
 * Build a Waze navigation deep-link URI.
 */
export function buildWazeNavURL({ lat, lng }) {
  return `waze://?ll=${lat},${lng}&navigate=yes`;
}

/**
 * Build a Waze browser-fallback URL.
 */
export function buildWazeBrowserURL({ lat, lng }) {
  return `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
}

/**
 * Open Google Maps for navigation — primary function for the driver app.
 *
 * Strategy:
 *   1. Validate coordinates
 *   2. Try native Google Maps app via deep link
 *   3. Fall back to browser if not installed
 *
 * @param {object} options
 * @param {number} options.lat
 * @param {number} options.lng
 * @param {string} [options.mode='d']
 * @param {string} [options.label]
 * @returns {Promise<{ success: boolean; method: 'app'|'browser'|'failed'; error?: string }>}
 */
export async function openGoogleMaps({ lat, lng, mode = 'd', label }) {
  if (!isValidCoords(lat, lng)) {
    return { success: false, method: 'failed', error: 'Invalid coordinates' };
  }

  // 1 — Try native app
  const appURL = buildGoogleMapsNavURL({ lat, lng, mode, label });
  const appOpened = await tryOpenURL(appURL);
  if (appOpened) {
    return { success: true, method: 'app' };
  }

  // 2 — Fallback: browser
  const browserURL = buildGoogleMapsBrowserURL({ lat, lng, mode, label });
  const browserOpened = await tryOpenURL(browserURL);
  if (browserOpened) {
    return { success: true, method: 'browser' };
  }

  return { success: false, method: 'failed', error: 'Could not open navigation' };
}

/**
 * Open Waze for navigation.
 *
 * @param {object} options
 * @param {number} options.lat
 * @param {number} options.lng
 * @returns {Promise<{ success: boolean; method: 'app'|'browser'|'failed'; error?: string }>}
 */
export async function openWaze({ lat, lng }) {
  if (!isValidCoords(lat, lng)) {
    return { success: false, method: 'failed', error: 'Invalid coordinates' };
  }

  const appURL = buildWazeNavURL({ lat, lng });
  const appOpened = await tryOpenURL(appURL);
  if (appOpened) return { success: true, method: 'app' };

  const browserURL = buildWazeBrowserURL({ lat, lng });
  const browserOpened = await tryOpenURL(browserURL);
  if (browserOpened) return { success: true, method: 'browser' };

  return { success: false, method: 'failed', error: 'Could not open Waze' };
}

/**
 * Get a route sharing link (Google Maps web URL).
 * Suitable for sharing via WhatsApp, SMS, etc.
 *
 * @param {object} options
 * @param {number}  options.toLat
 * @param {number}  options.toLng
 * @param {number}  [options.fromLat]
 * @param {number}  [options.fromLng]
 * @param {string}  [options.label]
 * @returns {string}
 */
export function buildShareableRouteURL({ toLat, toLng, fromLat, fromLng, label }) {
  let url = 'https://www.google.com/maps/dir/';
  if (fromLat != null && fromLng != null && isValidCoords(fromLat, fromLng)) {
    url += `${fromLat},${fromLng}/`;
  }
  url += `${toLat},${toLng}`;
  if (label) url += `/@${toLat},${toLng},15z`;
  return url;
}

/**
 * Detect which navigation apps are available on device.
 * Returns a list of { id, label, available } objects.
 *
 * @returns {Promise<Array<{ id: string; label: string; available: boolean }>>}
 */
export async function detectAvailableNavApps() {
  const [googleAvailable, wazeAvailable] = await Promise.all([
    isGoogleMapsInstalled(),
    isWazeInstalled(),
  ]);

  return [
    { id: 'google_maps', label: 'Google Maps', available: googleAvailable },
    { id: 'waze',        label: 'Waze',        available: wazeAvailable  },
    { id: 'browser',     label: 'Open in Browser', available: true       },
  ];
}

const navigationService = {
  openGoogleMaps,
  openWaze,
  buildShareableRouteURL,
  buildGoogleMapsNavURL,
  buildGoogleMapsBrowserURL,
  buildWazeNavURL,
  isGoogleMapsInstalled,
  isWazeInstalled,
  detectAvailableNavApps,
  isValidCoords,
  NAV_MODE,
};

export default navigationService;
