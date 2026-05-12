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
    const key   = API_KEY();
    const start = `${originLng},${originLat}`;
    const dest  = `${destLng},${destLat}`;
    const url   = `${ROUTE_BASE}/${key}/route_adv/driving/${start};${dest}?overview=false`;
    const { data } = await axios.get(url, { timeout: 8000 });

    const route = data?.routes?.[0];
    if (!route) {
      logger.error('mapsService.getDistanceMatrix — no route returned', { data });
      throw new AppError('Could not calculate distance between the two points.', 502, 'MAPS_API_FAILED');
    }

    const distance_km  = parseFloat(((route.distance || 0) / 1000).toFixed(2));
    const duration_min = parseFloat(((route.duration || 0) / 60).toFixed(1));
    return { distance_km, duration_min };
  } catch (err) {
    if (err instanceof AppError) throw err;
    logger.error('mapsService.getDistanceMatrix — request error', { error: err.message });
    throw new AppError('Mappls Maps API request failed.', 502, 'MAPS_API_FAILED');
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
    const key   = API_KEY();
    const start = `${originLng},${originLat}`;
    const dest  = `${destLng},${destLat}`;
    const url   = `${ROUTE_BASE}/${key}/route_adv/driving/${start};${dest}?geometries=polyline&overview=full`;
    const { data } = await axios.get(url, { timeout: 8000 });

    const geometry = data?.routes?.[0]?.geometry;
    if (geometry) return geometry; // encoded polyline string
  } catch (err) {
    logger.warn('mapsService.getRoutePolyline — failed', { error: err.message });
  }
  return null;
}

module.exports = { getDistanceMatrix, reverseGeocode, getRoutePolyline };
