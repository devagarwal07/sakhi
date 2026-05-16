'use strict';

/**
 * mapsService.js — Mappls (MapmyIndia) REST API replacement
 *
 * Replaces Google Maps APIs with Mappls equivalents:
 *   - Distance/Duration   → Mappls Route Advanced API
 *   - Reverse Geocode     → Mappls Reverse Geocode API
 *   - Route Polyline      → Mappls Route Advanced API
 *
 * Env vars required (backend/.env.local):
 *   MAPPLS_API_KEY          — REST API key
 *   MAPPLS_CLIENT_ID        — OAuth client id
 *   MAPPLS_CLIENT_SECRET    — OAuth client secret
 */

const axios  = require('axios');
const AppError = require('../utils/AppError');
const logger   = require('../utils/logger');

const API_KEY       = () => process.env.MAPPLS_API_KEY;
const CLIENT_ID     = () => process.env.MAPPLS_CLIENT_ID;
const CLIENT_SECRET = () => process.env.MAPPLS_CLIENT_SECRET;
const ROUTE_BASE    = 'https://apis.mappls.com/advancedmaps/v1';
const ATLAS_BASE    = 'https://atlas.mappls.com/api';

// ── Haversine fallback ─────────────────────────────────────────────────────────
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng/2)**2;
  return parseFloat((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))).toFixed(2));
}

// ── OAuth token cache ──────────────────────────────────────────────────────────
let _token  = null;
let _expiry = 0;

async function getToken() {
  if (_token && Date.now() < _expiry) return _token;
  const { data } = await axios.post(
    'https://outpost.mappls.com/api/security/oauth/token',
    null,
    {
      params: {
        grant_type:    'client_credentials',
        client_id:     CLIENT_ID(),
        client_secret: CLIENT_SECRET(),
      },
      timeout: 6000,
    }
  );
  _token  = data.access_token;
  _expiry = Date.now() + (data.expires_in - 60) * 1000;
  return _token;
}

// ── Distance & Duration ────────────────────────────────────────────────────────
/**
 * getDistanceMatrix — Mappls Route Advanced API
 * Returns { distance_km, duration_min }
 */
async function getDistanceMatrix(originLat, originLng, destLat, destLng) {
  try {
    const key = API_KEY();
    if (!key) throw new Error('No MAPPLS_API_KEY — using haversine fallback');
    const start = `${originLng},${originLat}`;
    const dest  = `${destLng},${destLat}`;
    const url   = `${ROUTE_BASE}/${key}/route_adv/driving/${start};${dest}?overview=false`;
    const { data } = await axios.get(url, { timeout: 8000 });

    const route = data?.routes?.[0];
    if (!route) throw new Error('No route returned by Mappls');

    const distance_km  = parseFloat(((route.distance || 0) / 1000).toFixed(2));
    const duration_min = parseFloat(((route.duration || 0) / 60).toFixed(1));
    return { distance_km, duration_min };
  } catch (err) {
    // Graceful fallback — use straight-line distance with urban speed estimate
    logger.warn('mapsService.getDistanceMatrix — falling back to haversine', { error: err.message });
    const distance_km  = haversineKm(originLat, originLng, destLat, destLng);
    const duration_min = parseFloat(((distance_km / 20) * 60).toFixed(1)); // 20 km/h urban
    return { distance_km, duration_min };
  }
}

// ── Reverse Geocoding ──────────────────────────────────────────────────────────
/**
 * reverseGeocode — Mappls Reverse Geocode API
 * Returns formatted address string or coordinate fallback.
 */
async function reverseGeocode(lat, lng) {
  try {
    const key = API_KEY();
    const { data } = await axios.get(
      `${ROUTE_BASE}/${key}/rev_geocode`,
      { params: { lat, lng }, timeout: 6000 }
    );
    const address = data?.results?.address;
    if (address) return address;
  } catch (err) {
    logger.warn('mapsService.reverseGeocode — failed, using coordinate fallback', { error: err.message });
  }
  return `${parseFloat(lat).toFixed(5)}, ${parseFloat(lng).toFixed(5)}`;
}

// ── Route Polyline ─────────────────────────────────────────────────────────────
/**
 * getRoutePolyline — Mappls Route Advanced API
 * Returns the encoded overview polyline string (same encoding as Google).
 */
async function getRoutePolyline(originLat, originLng, destLat, destLng) {
  try {
    const key = API_KEY();
    if (!key) return null;
    const start = `${originLng},${originLat}`;
    const dest  = `${destLng},${destLat}`;
    const url   = `${ROUTE_BASE}/${key}/route_adv/driving/${start};${dest}?geometries=polyline&overview=full`;
    const { data } = await axios.get(url, { timeout: 8000 });

    const geometry = data?.routes?.[0]?.geometry;
    if (geometry) return geometry;
  } catch (err) {
    logger.warn('mapsService.getRoutePolyline — failed', { error: err.message });
  }
  return null;
}

module.exports = { getDistanceMatrix, reverseGeocode, getRoutePolyline };
