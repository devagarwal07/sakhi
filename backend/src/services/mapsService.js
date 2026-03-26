'use strict';

const axios = require('axios');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

const MAPS_BASE = 'https://maps.googleapis.com/maps/api';
const KEY = () => process.env.GOOGLE_MAPS_KEY;

/**
 * getDistanceMatrix — Google Distance Matrix API
 * Returns { distance_km, duration_min }
 */
async function getDistanceMatrix(originLat, originLng, destLat, destLng) {
  try {
    const { data } = await axios.get(`${MAPS_BASE}/distancematrix/json`, {
      params: {
        origins: `${originLat},${originLng}`,
        destinations: `${destLat},${destLng}`,
        units: 'metric',
        key: KEY(),
      },
      timeout: 8000,
    });

    const element = data?.rows?.[0]?.elements?.[0];

    if (!element || element.status !== 'OK') {
      logger.error('mapsService.getDistanceMatrix — bad element', { element, status: data?.status });
      throw new AppError('Could not calculate distance between the two points.', 502, 'MAPS_API_FAILED');
    }

    const distance_km = parseFloat((element.distance.value / 1000).toFixed(2));
    const duration_min = parseFloat((element.duration.value / 60).toFixed(1));

    return { distance_km, duration_min };
  } catch (err) {
    if (err instanceof AppError) throw err;
    logger.error('mapsService.getDistanceMatrix — request error', { error: err.message });
    throw new AppError('Google Maps API request failed.', 502, 'MAPS_API_FAILED');
  }
}

/**
 * reverseGeocode — Google Geocoding API
 * Returns formatted_address string or a fallback coordinate string.
 */
async function reverseGeocode(lat, lng) {
  try {
    const { data } = await axios.get(`${MAPS_BASE}/geocode/json`, {
      params: { latlng: `${lat},${lng}`, key: KEY() },
      timeout: 6000,
    });

    const result = data?.results?.[0];
    if (result) return result.formatted_address;
  } catch (err) {
    logger.warn('mapsService.reverseGeocode — failed, using coordinate fallback', { error: err.message });
  }
  // Graceful fallback
  return `${parseFloat(lat).toFixed(5)}, ${parseFloat(lng).toFixed(5)}`;
}

/**
 * getRoutePolyline — Google Directions API
 * Returns the encoded overview polyline string.
 */
async function getRoutePolyline(originLat, originLng, destLat, destLng) {
  try {
    const { data } = await axios.get(`${MAPS_BASE}/directions/json`, {
      params: {
        origin: `${originLat},${originLng}`,
        destination: `${destLat},${destLng}`,
        key: KEY(),
      },
      timeout: 8000,
    });

    const route = data?.routes?.[0];
    if (route?.overview_polyline?.points) {
      return route.overview_polyline.points;
    }
  } catch (err) {
    logger.warn('mapsService.getRoutePolyline — failed', { error: err.message });
  }
  return null; // non-fatal
}

module.exports = { getDistanceMatrix, reverseGeocode, getRoutePolyline };
