'use strict';

const EventEmitter = require('events');
const supabase = require('../config/supabase');
const fcmService = require('./fcmService');
const logger = require('../utils/logger');

// ── Haversine distance (meters) ───────────────────────────────────────────────
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Constants ─────────────────────────────────────────────────────────────────
const INITIAL_RADIUS = 2000;   // meters
const MAX_RADIUS = 10000;      // meters
const RADIUS_STEP = 1000;      // meters per expansion
const DRIVER_TIMEOUT_MS = 30000; // 30 seconds per driver
const MAX_MATCHING_MS = 5 * 60 * 1000; // 5-minute global cap

class MatchingEngine extends EventEmitter {
  constructor() {
    super();
    // Map<rideId, { candidateIndex, radius, drivers, timeoutHandle, globalTimeout }>
    this.activeSearches = new Map();
    this._io = null;
  }

  /** Called from server.js after Socket.IO is initialised */
  setIO(io) {
    this._io = io;
  }

  get io() {
    return this._io || require('../../../server').io || null;
  }

  // ── Emit helpers ─────────────────────────────────────────────────────────────
  _emitToDriver(driverId, event, data) {
    if (this._io) this._io.of('/rides').to(`driver:${driverId}`).emit(event, data);
  }

  _emitToRide(rideId, event, data) {
    if (this._io) this._io.of('/rides').to(`ride:${rideId}`).emit(event, data);
  }

  _emitToRider(riderId, event, data) {
    if (this._io) this._io.of('/rides').to(`rider:${riderId}`).emit(event, data);
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // startMatching(rideId)
  // ──────────────────────────────────────────────────────────────────────────────
  async startMatching(rideId) {
    try {
      // STEP 1 — Load ride
      const { data: rides } = await supabase
        .from('rides')
        .select('*, users!rides_rider_id_fkey(name)')
        .eq('id', rideId)
        .limit(1);

      const ride = rides?.[0];
      if (!ride || ride.status !== 'searching') {
        logger.warn('MatchingEngine.startMatching — ride not found or not searching', { rideId, status: ride?.status });
        return;
      }

      ride.rider_name = ride.users?.name || 'Rider';

      // Global 5-minute cap
      const globalTimeout = setTimeout(async () => {
        await this._noDriversAvailable(rideId, ride.rider_id);
      }, MAX_MATCHING_MS);

      this.activeSearches.set(rideId, {
        candidateIndex: 0,
        radius: INITIAL_RADIUS,
        drivers: [],
        timeoutHandle: null,
        globalTimeout,
        ride,
      });

      await this._findAndSend(rideId);
    } catch (err) {
      logger.error('MatchingEngine.startMatching — error', { rideId, error: err.message });
    }
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // _findAndSend — STEP 2 + 3 + 4
  // ──────────────────────────────────────────────────────────────────────────────
  async _findAndSend(rideId) {
    const session = this.activeSearches.get(rideId);
    if (!session) return;

    const { ride } = session;
    let { radius, candidateIndex } = session;

    // Abort if ride is no longer searching (e.g. rider cancelled)
    const { data: check } = await supabase
      .from('rides')
      .select('status')
      .eq('id', rideId)
      .limit(1);
    if (!check?.[0] || check[0].status !== 'searching') {
      this._cleanup(rideId);
      return;
    }

    // STEP 2 — Find candidates using Haversine
    const candidates = await this._queryCandidates(
      ride.pickup_lat,
      ride.pickup_lng,
      radius
    );

    // STEP 3 — Radius expansion if no candidates
    if (candidates.length === 0) {
      if (radius < MAX_RADIUS) {
        const newRadius = radius + RADIUS_STEP;
        logger.info('MatchingEngine — expanding radius', { rideId, from: radius, to: newRadius });
        session.radius = newRadius;
        session.candidateIndex = 0;
        session.drivers = [];
        return this._findAndSend(rideId);
      }
      // Exhausted — no drivers available
      return this._noDriversAvailable(rideId, ride.rider_id);
    }

    // Store fresh candidate list only on first run of this radius
    if (session.drivers.length === 0 || candidateIndex === 0) {
      session.drivers = candidates;
      candidateIndex = 0;
    }

    // STEP 4 — Send to next candidate
    await this._sendToCandidate(rideId, candidates, candidateIndex);
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // _queryCandidates — fetch online eligible drivers within radius
  // ──────────────────────────────────────────────────────────────────────────────
  async _queryCandidates(pickupLat, pickupLng, radiusMeters) {
    const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    // Fetch all eligible online drivers with fresh locations
    const { data: rows, error } = await supabase
      .from('drivers')
      .select(`
        id, name, phone, fcm_token, vehicle_type, vehicle_reg_no,
        vehicle_color, vehicle_model, language_pref,
        driver_locations!inner(lat, lng, updated_at)
      `)
      .eq('is_online', true)
      .eq('is_active', true)
      .eq('gender_verified', true)
      .eq('verification_status', 'approved')
      .gte('driver_locations.updated_at', fiveMinsAgo);

    if (error || !rows) {
      logger.error('MatchingEngine._queryCandidates — DB error', { error });
      return [];
    }

    // Get IDs of drivers on an active ride
    const { data: busyRides } = await supabase
      .from('rides')
      .select('driver_id')
      .in('status', ['assigned', 'driver_en_route', 'arrived', 'in_progress'])
      .not('driver_id', 'is', null);
    const busyIds = new Set((busyRides || []).map((r) => r.driver_id));

    // Get IDs of blocked drivers
    const { data: blockedRows } = await supabase
      .from('driver_blocks')
      .select('driver_id')
      .gt('blocked_until', new Date().toISOString());
    const blockedIds = new Set((blockedRows || []).map((r) => r.driver_id));

    // Filter + compute Haversine distance, then sort ascending
    return rows
      .filter((d) => !busyIds.has(d.id) && !blockedIds.has(d.id))
      .map((d) => {
        const loc = Array.isArray(d.driver_locations) ? d.driver_locations[0] : d.driver_locations;
        const distance_meters = haversine(pickupLat, pickupLng, loc.lat, loc.lng);
        return { ...d, lat: loc.lat, lng: loc.lng, distance_meters };
      })
      .filter((d) => d.distance_meters <= radiusMeters)
      .sort((a, b) => a.distance_meters - b.distance_meters);
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // _sendToCandidate — STEP 4
  // ──────────────────────────────────────────────────────────────────────────────
  async _sendToCandidate(rideId, candidates, index) {
    const session = this.activeSearches.get(rideId);
    if (!session) return;

    if (index >= candidates.length) {
      // All candidates exhausted — try expanding radius
      const newRadius = session.radius + RADIUS_STEP;
      if (newRadius > MAX_RADIUS) {
        return this._noDriversAvailable(rideId, session.ride.rider_id);
      }
      session.radius = newRadius;
      session.candidateIndex = 0;
      session.drivers = [];
      return this._findAndSend(rideId);
    }

    const driver = candidates[index];
    const { ride } = session;

    // Re-check driver is still online before sending (edge case: Prompt 19 #2)
    const { data: driverCheck } = await supabase
      .from('drivers')
      .select('is_online')
      .eq('id', driver.id)
      .limit(1);
    if (!driverCheck?.[0]?.is_online) {
      // Skip to next
      session.candidateIndex = index + 1;
      return this._sendToCandidate(rideId, candidates, index + 1);
    }

    const requestPayload = {
      ride_id: rideId,
      pickup_address: ride.pickup_address,
      drop_address: ride.drop_address,
      distance_km: ride.distance_km,
      estimated_fare: ride.estimated_fare,
      rider_name: ride.rider_name,
      pickup_lat: ride.pickup_lat,
      pickup_lng: ride.pickup_lng,
      timeout_seconds: 30,
    };

    // Emit socket event to driver
    this._emitToDriver(driver.id, 'ride_request', requestPayload);

    // FCM push to driver
    fcmService.sendToUser(driver.id, 'driver', {
      title: 'New Ride Request',
      body: `Pickup: ${ride.pickup_address}`,
      data: { type: 'RIDE_REQUEST', ...Object.fromEntries(Object.entries(requestPayload).map(([k, v]) => [k, String(v)])) },
    }).catch((err) => logger.warn('MatchingEngine — FCM to driver failed', { error: err.message }));

    // 30-second timeout
    const timeoutHandle = setTimeout(() => {
      this._handleDriverTimeout(rideId, driver.id);
    }, DRIVER_TIMEOUT_MS);

    session.candidateIndex = index + 1;
    session.drivers = candidates;
    session.timeoutHandle = timeoutHandle;

    logger.info('MatchingEngine — request sent to driver', { rideId, driverId: driver.id, index });
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // _handleDriverTimeout — STEP 5
  // ──────────────────────────────────────────────────────────────────────────────
  _handleDriverTimeout(rideId, driverId) {
    const session = this.activeSearches.get(rideId);
    if (!session) return;

    logger.info('MatchingEngine — driver timeout', { rideId, driverId });

    // Notify driver the request expired
    this._emitToDriver(driverId, 'ride_request_expired', { ride_id: rideId });

    const { drivers, candidateIndex } = session;
    this._sendToCandidate(rideId, drivers, candidateIndex).catch((err) =>
      logger.error('MatchingEngine._handleDriverTimeout — error', { error: err.message })
    );
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // handleDriverAccept(rideId, driverId)
  // ──────────────────────────────────────────────────────────────────────────────
  async handleDriverAccept(rideId, driverId) {
    try {
      const session = this.activeSearches.get(rideId);

      // 1. Check ride is still searching
      const { data: rides } = await supabase
        .from('rides')
        .select('status, rider_id')
        .eq('id', rideId)
        .limit(1);

      const ride = rides?.[0];
      if (!ride || ride.status !== 'searching') {
        this._emitToDriver(driverId, 'ride_already_assigned', { ride_id: rideId });
        return;
      }

      // 2a. EDGE CASE #5 — Guard: driver must not already be on an active ride
      const { count: activeCount } = await supabase
        .from('rides')
        .select('id', { count: 'exact', head: true })
        .eq('driver_id', driverId)
        .in('status', ['assigned', 'driver_en_route', 'arrived', 'in_progress']);

      if (activeCount > 0) {
        logger.warn('MatchingEngine.handleDriverAccept — driver already on active ride', { rideId, driverId });
        this._emitToDriver(driverId, 'ride_already_assigned', { ride_id: rideId, reason: 'already_on_ride' });
        return;
      }

      // 2b. Clear timeout
      if (session?.timeoutHandle) clearTimeout(session.timeoutHandle);

      // 3. Optimistic-lock UPDATE — only succeeds if status is still 'searching'
      const { data: updated, error } = await supabase
        .from('rides')
        .update({ driver_id: driverId, status: 'assigned' })
        .eq('id', rideId)
        .eq('status', 'searching')
        .select('id');

      if (error || !updated || updated.length === 0) {
        // Race condition — another driver won
        logger.warn('MatchingEngine.handleDriverAccept — race condition', { rideId, driverId });
        this._emitToDriver(driverId, 'ride_already_assigned', { ride_id: rideId });
        return;
      }

      // 4. Cleanup
      this._cleanup(rideId);

      // 5. Fetch driver details
      const { data: drivers } = await supabase
        .from('drivers')
        .select('id, name, phone, vehicle_type, vehicle_reg_no, vehicle_color, vehicle_model, profile_photo_url')
        .eq('id', driverId)
        .limit(1);

      const driver = drivers?.[0] || { id: driverId };

      // 6. Emit to ride room
      this._emitToRide(rideId, 'ride_assigned', {
        ride_id: rideId,
        driver,
        status: 'assigned',
      });

      // 7. FCM to rider
      fcmService.sendToUser(ride.rider_id, 'rider', {
        title: 'Driver Found! 🚗',
        body: `${driver.name || 'Your driver'} is on the way.`,
        data: {
          type: 'RIDE_ASSIGNED',
          drive_id: driverId,
          driver_name: driver.name || '',
          vehicle: driver.vehicle_model || '',
        },
      }).catch(() => {});

      // 8. FCM confirmation to driver
      fcmService.sendToUser(driverId, 'driver', {
        title: 'Ride Accepted!',
        body: 'Navigate to pickup point.',
        data: { type: 'RIDE_ASSIGNED', ride_id: rideId },
      }).catch(() => {});

      logger.info('MatchingEngine.handleDriverAccept — assigned', { rideId, driverId });
    } catch (err) {
      logger.error('MatchingEngine.handleDriverAccept — error', { rideId, driverId, error: err.message });
    }
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // handleDriverReject(rideId, driverId)
  // ──────────────────────────────────────────────────────────────────────────────
  async handleDriverReject(rideId, driverId) {
    const session = this.activeSearches.get(rideId);
    if (!session) return;

    logger.info('MatchingEngine.handleDriverReject', { rideId, driverId });

    if (session.timeoutHandle) clearTimeout(session.timeoutHandle);

    const { drivers, candidateIndex } = session;
    await this._sendToCandidate(rideId, drivers, candidateIndex);
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // cancelSearch(rideId) — rider cancels before assignment
  // ──────────────────────────────────────────────────────────────────────────────
  cancelSearch(rideId) {
    const session = this.activeSearches.get(rideId);
    if (!session) return;

    if (session.timeoutHandle) clearTimeout(session.timeoutHandle);
    if (session.globalTimeout) clearTimeout(session.globalTimeout);

    // Notify current candidate driver if any
    const { drivers, candidateIndex } = session;
    const currentDriverIdx = Math.max(0, candidateIndex - 1);
    const currentDriver = drivers?.[currentDriverIdx];
    if (currentDriver) {
      this._emitToDriver(currentDriver.id, 'ride_cancelled', { ride_id: rideId });
    }

    this.activeSearches.delete(rideId);
    logger.info('MatchingEngine.cancelSearch — search cancelled', { rideId });
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // _noDriversAvailable — update ride + notify rider
  // ──────────────────────────────────────────────────────────────────────────────
  async _noDriversAvailable(rideId, riderId) {
    this._cleanup(rideId);

    await supabase
      .from('rides')
      .update({ status: 'no_drivers_available', cancelled_by: 'system' })
      .eq('id', rideId);

    this._emitToRider(riderId, 'ride:no_drivers', { ride_id: rideId });

    fcmService.sendToUser(riderId, 'rider', {
      title: 'No Drivers Available',
      body: 'No drivers available nearby. Please try again in a few minutes.',
      data: { type: 'NO_DRIVERS_AVAILABLE', ride_id: rideId },
    }).catch(() => {});

    logger.info('MatchingEngine — no drivers available', { rideId });
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // _cleanup — clear all timers + remove from map
  // ──────────────────────────────────────────────────────────────────────────────
  _cleanup(rideId) {
    const session = this.activeSearches.get(rideId);
    if (!session) return;
    if (session.timeoutHandle) clearTimeout(session.timeoutHandle);
    if (session.globalTimeout) clearTimeout(session.globalTimeout);
    this.activeSearches.delete(rideId);
  }
}

// Singleton export
module.exports = new MatchingEngine();
