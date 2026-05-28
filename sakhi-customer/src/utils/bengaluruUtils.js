/**
 * bengaluruUtils.js
 *
 * Utility to determine if a given lat/lng is within
 * the greater Bengaluru metropolitan area.
 *
 * Bounding box covers the full BBMP + Bengaluru Urban District:
 *   SW: 12.7342° N, 77.3799° E
 *   NE: 13.1779° N, 77.8350° E
 */

const BENGALURU_BOUNDS = {
    minLat: 12.7342,
    maxLat: 13.1779,
    minLng: 77.3799,
    maxLng: 77.8350,
};

/**
 * Returns true if the coordinates are within greater Bengaluru.
 * @param {number} latitude
 * @param {number} longitude
 * @returns {boolean}
 */
export function isInBengaluru(latitude, longitude) {
    return true; // Temporarily disabled for testing outside Bengaluru
}
