'use strict';

const supabase = require('../config/supabase');
const fcmService = require('./fcmService');
const polylineUtil = require('../utils/polyline');
const logger = require('../utils/logger');

const POLL_INTERVAL_MS = 60_000;         // 60 seconds
const LOCATION_STALE_MS = 3 * 60_000;   // 3 minutes
const DEVIATION_THRESHOLD_M = 500;       // meters
const DEVIATION_COOLDOWN_MS = 5 * 60_000; // 5-minute cooldown between deviation alerts

// ── Per-ride tracking state (in-memory) ────────────────────────────────────────
// Map<rideId, { lastLocationStaleAlert, lastDeviationAlert, durationAlerted }>
const rideState = new Map();

let globalInterval = null;
let _io = null;

// ── Emitter helper ─────────────────────────────────────────────────────────────
function emitToRide(rideId, event, data) {
  if (_io) _io.of('/rides').to(`ride:${rideId}`).emit(event, data);
}

function emitToAdmin(event, data) {
  if (_io) _io.of('/rides').to('admin:monitoring').emit(event, data);
}

// ── Append anomaly alert to rides.anomaly_alerts ──────────────────────────────
async function appendAlert(rideId, alert) {
  try {
    // Fetch current alerts array
    const { data } = await supabase
      .from('rides')
      .select('anomaly_alerts')
      .eq('id', rideId)
      .single();

    const existing = data?.anomaly_alerts || [];
    const updated = [...existing, alert];

    await supabase.from('rides').update({ anomaly_alerts: updated }).eq('id', rideId);
  } catch (err) {
    logger.error('anomalyService.appendAlert — error', { rideId, error: err.message });
  }
}

// ── CONDITION 1: Location stale ───────────────────────────────────────────────
async function checkLocationStale(ride, state) {
  const { data: locRows } = await supabase
    .from('driver_locations')
    .select('updated_at')
    .eq('driver_id', ride.driver_id)
    .limit(1);

  const updatedAt = locRows?.[0]?.updated_at;
  const isStale = !updatedAt || Date.now() - new Date(updatedAt).getTime() > LOCATION_STALE_MS;

  if (!isStale) return;

  // Deduplicate — only alert once per stale window (don't alert twice in a row)
  if (state.lastLocationStaleAlert && Date.now() - state.lastLocationStaleAlert < LOCATION_STALE_MS) return;

  state.lastLocationStaleAlert = Date.now();

  logger.warn('anomalyService — CONDITION 1: location stale', { rideId: ride.id, driverId: ride.driver_id });

  await appendAlert(ride.id, { type: 'location_stale', detected_at: new Date().toISOString(), driver_id: ride.driver_id });
  emitToRide(ride.id, 'ride:anomaly', { type: 'location_stale', ride_id: ride.id });

  fcmService.sendToUser(ride.rider_id, 'rider', {
    title: 'Driver Signal Lost 📡',
    body: "We've lost contact with your driver. Please contact them or use SOS if needed.",
    data: { type: 'ANOMALY_LOCATION_STALE', ride_id: ride.id },
  }).catch(() => {});
}

// ── CONDITION 2: Route deviation ──────────────────────────────────────────────
async function checkRouteDeviation(ride, state) {
  if (!ride.route_polyline) return;

  // Cooldown: only check once per 5 minutes
  if (state.lastDeviationAlert && Date.now() - state.lastDeviationAlert < DEVIATION_COOLDOWN_MS) return;

  // Get driver current location
  const { data: locRows } = await supabase
    .from('driver_locations')
    .select('lat, lng')
    .eq('driver_id', ride.driver_id)
    .limit(1);

  const loc = locRows?.[0];
  if (!loc) return;

  const polylinePoints = polylineUtil.decode(ride.route_polyline);
  if (!polylinePoints.length) return;

  const deviationMeters = polylineUtil.minDistanceToPolyline(loc.lat, loc.lng, polylinePoints);

  if (deviationMeters <= DEVIATION_THRESHOLD_M) return;

  state.lastDeviationAlert = Date.now();

  logger.warn('anomalyService — CONDITION 2: route deviation', {
    rideId: ride.id,
    driverId: ride.driver_id,
    deviationMeters: Math.round(deviationMeters),
  });

  const alert = {
    type: 'route_deviation',
    detected_at: new Date().toISOString(),
    driver_lat: loc.lat,
    driver_lng: loc.lng,
    deviation_meters: Math.round(deviationMeters),
  };

  await appendAlert(ride.id, alert);
  emitToRide(ride.id, 'ride:anomaly', { type: 'route_deviation', deviation_meters: Math.round(deviationMeters), ride_id: ride.id });
  emitToAdmin('ride:anomaly_alert', { ride_id: ride.id, ...alert });

  fcmService.sendToUser(ride.rider_id, 'rider', {
    title: 'Route Deviation Alert ⚠️',
    body: 'Your driver appears to have gone off the expected route.',
    data: { type: 'ANOMALY_ROUTE_DEVIATION', ride_id: ride.id },
  }).catch(() => {});

  fcmService.sendToUser(ride.driver_id, 'driver', {
    title: 'Route Deviation',
    body: 'Route deviation detected. Please return to the expected route.',
    data: { type: 'ANOMALY_ROUTE_DEVIATION', ride_id: ride.id },
  }).catch(() => {});
}

// ── CONDITION 3: Trip duration exceeded ───────────────────────────────────────
async function checkDurationExceeded(ride, state) {
  if (state.durationAlerted) return;
  if (!ride.started_at || !ride.duration_min) return;

  const startedAt = new Date(ride.started_at).getTime();
  const expectedEndMs = startedAt + ride.duration_min * 2 * 60 * 1000;

  if (Date.now() <= expectedEndMs) return;

  state.durationAlerted = true;

  logger.warn('anomalyService — CONDITION 3: duration exceeded', { rideId: ride.id });

  await appendAlert(ride.id, { type: 'duration_exceeded', detected_at: new Date().toISOString() });

  const msg = 'Your trip is taking longer than expected. Is everything OK?';

  fcmService.sendToUser(ride.rider_id, 'rider', {
    title: 'Trip Running Long ⏳',
    body: msg,
    data: { type: 'ANOMALY_DURATION_EXCEEDED', ride_id: ride.id },
  }).catch(() => {});

  fcmService.sendToUser(ride.driver_id, 'driver', {
    title: 'Trip Running Long ⏳',
    body: msg,
    data: { type: 'ANOMALY_DURATION_EXCEEDED', ride_id: ride.id },
  }).catch(() => {});

  emitToRide(ride.id, 'ride:anomaly', { type: 'duration_exceeded', ride_id: ride.id });
}

// ── Poll: check all in_progress rides ─────────────────────────────────────────
async function pollInProgressRides() {
  try {
    const { data: rides, error } = await supabase
      .from('rides')
      .select('id, rider_id, driver_id, status, route_polyline, started_at, duration_min, waiting_start_at')
      .eq('status', 'in_progress');

    if (error || !rides?.length) return;

    await Promise.all(
      rides.map(async (ride) => {
        if (!rideState.has(ride.id)) {
          rideState.set(ride.id, { lastLocationStaleAlert: null, lastDeviationAlert: null, durationAlerted: false });
        }
        const state = rideState.get(ride.id);
        await Promise.all([
          checkLocationStale(ride, state),
          checkRouteDeviation(ride, state),
          checkDurationExceeded(ride, state),
        ]);
      })
    );
  } catch (err) {
    logger.error('anomalyService.pollInProgressRides — error', { error: err.message });
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Start the global anomaly monitor. Called once from server.js after io is ready.
 */
function startGlobalAnomalyMonitor(io) {
  if (globalInterval) return; // Already running
  _io = io;
  globalInterval = setInterval(pollInProgressRides, POLL_INTERVAL_MS);
  logger.info('anomalyService — global monitor started (60s interval)');
}

/**
 * Start per-ride monitoring state (called when a ride enters in_progress).
 */
function startMonitoring(rideId) {
  if (!rideState.has(rideId)) {
    rideState.set(rideId, { lastLocationStaleAlert: null, lastDeviationAlert: null, durationAlerted: false });
  }
  logger.info('anomalyService.startMonitoring', { rideId });
}

/**
 * Clean up per-ride state (called when a ride completes or cancels).
 */
function stopMonitoring(rideId) {
  rideState.delete(rideId);
  logger.info('anomalyService.stopMonitoring', { rideId });
}

// Alias for backwards compat with rideService
const stopMonitoringRide = stopMonitoring;

module.exports = {
  startGlobalAnomalyMonitor,
  startMonitoring,
  stopMonitoring,
  stopMonitoringRide,
};
