'use strict';

/**
 * Google Encoded Polyline decoder.
 * Returns array of [lat, lng] pairs.
 */
function decode(encoded) {
  const points = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let result = 1;
    let shift = 0;
    let b;
    do {
      b = encoded.charCodeAt(index++) - 63 - 1;
      result += b << shift;
      shift += 5;
    } while (b >= 0x1f);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    result = 1;
    shift = 0;
    do {
      b = encoded.charCodeAt(index++) - 63 - 1;
      result += b << shift;
      shift += 5;
    } while (b >= 0x1f);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    points.push([lat * 1e-5, lng * 1e-5]);
  }

  return points;
}

// ── Haversine distance (meters) ───────────────────────────────────────────────
function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Minimum distance (meters) from a point to a line segment.
 * Uses projection onto the segment with Haversine for final distance.
 */
function pointToSegmentDistance(pLat, pLng, aLat, aLng, bLat, bLng) {
  // Work in a flat approximation for short distances
  const dx = bLng - aLng;
  const dy = bLat - aLat;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) return haversineMeters(pLat, pLng, aLat, aLng);

  let t = ((pLng - aLng) * dx + (pLat - aLat) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));

  const closestLat = aLat + t * dy;
  const closestLng = aLng + t * dx;

  return haversineMeters(pLat, pLng, closestLat, closestLng);
}

/**
 * Minimum distance from a point to any segment of the polyline.
 * @param {number} lat
 * @param {number} lng
 * @param {Array<[number,number]>} polylinePoints  — array of [lat, lng]
 * @returns {number} distance in meters
 */
function minDistanceToPolyline(lat, lng, polylinePoints) {
  if (!polylinePoints || polylinePoints.length === 0) return Infinity;
  if (polylinePoints.length === 1) {
    return haversineMeters(lat, lng, polylinePoints[0][0], polylinePoints[0][1]);
  }

  let minDist = Infinity;
  for (let i = 0; i < polylinePoints.length - 1; i++) {
    const [aLat, aLng] = polylinePoints[i];
    const [bLat, bLng] = polylinePoints[i + 1];
    const d = pointToSegmentDistance(lat, lng, aLat, aLng, bLat, bLng);
    if (d < minDist) minDist = d;
  }
  return minDist;
}

module.exports = { decode, minDistanceToPolyline, haversineMeters };
