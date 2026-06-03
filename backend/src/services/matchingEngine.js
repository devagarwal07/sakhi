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

/** Estimate driving time in minutes given distance in km (conservative urban avg) */
function estimateEtaMin(distanceKm) {
  return (distanceKm / AVG_URBAN_SPEED_KMH) * 60;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const INITIAL_RADIUS    = 2000;            // meters — initial search radius
const MAX_RADIUS        = 10000;           // meters — max search radius
const RADIUS_STEP       = 1000;            // meters per expansion step
const DRIVER_TIMEOUT_MS = 30_000;          // 30 s per driver offer
const MAX_MATCHING_MS   = 5 * 60 * 1000;  // 5-min global cap

// ── Scenario 1: Pre-Dispatch ──────────────────────────────────────────────────
// A driver that is `in_progress` but within PRE_DISPATCH_THRESHOLD_KM of their
// drop-off (≈5 min at urban speed) is eligible for the next ride request.
const PRE_DISPATCH_THRESHOLD_KM = 1.7;    // ~5 min @ 20 km/h
const AVG_URBAN_SPEED_KMH       = 20;     // conservative urban speed for ETA

// ── Scenario 3: Min-Wait for busy drivers ────────────────────────────────────
// In-progress drivers are only offered a new ride if the total customer wait
// (time for driver to finish + travel to new pickup) is within this cap.
const MAX_OFFER_WAIT_MINS = 15;

// ── Scenario 2: Subscription safety window ───────────────────────────────────
// When a driver has an upcoming scheduled subscription ride, they are skipped
// for a new request if accepting it would make them late.
const SUBSCRIPTION_BUFFER_MINS = 60;       // look-ahead window

// ── Dispatch scoring weights ───────────────────────────────────────────────────
//
// Final composite_score = distance_meters × rar_penalty × gps_penalty
//
// RAR (Ride Acceptance Rate) penalty:
//   effectiveRar = acceptance_rate clamped to [0,1]
//   new drivers (<10 requests) get effectiveRar = 1.0 (protected)
//   penalty = 1 + RAR_PENALTY_FACTOR × (1 − effectiveRar)
//   RAR=1.00 → ×1.00   (no penalty, gets next request first)
//   RAR=0.70 → ×1.45   (appears 45% farther than actual distance)
//   RAR=0.50 → ×1.75   (appears 75% farther)
//   RAR=0.00 → ×2.50   (appears 150% farther — nearly always skipped)
//
// GPS staleness penalty (connectivity / speed proxy):
//   <  30 s → ×1.00   fresh ping, full trust
//   30– 90 s → ×1.08   mildly stale
//   90–180 s → ×1.18   moderately stale
//  180–300 s → ×1.30   approaching 5-min cutoff
//
const RAR_PENALTY_FACTOR = 1.5;

// ── GPS Staleness helper ──────────────────────────────────────────────────────
function gpsStalenessMultiplier(updatedAt, now) {
  const ageSecs = (now - new Date(updatedAt).getTime()) / 1000;
  if (ageSecs <  30) return 1.00;
  if (ageSecs <  90) return 1.08;
  if (ageSecs < 180) return 1.18;
  return 1.30;
}

// ── Score helper — shared by idle and pre-dispatch candidates ─────────────────
function computeDriverScore(d, distanceMeters, now) {
  const loc = Array.isArray(d.driver_locations) ? d.driver_locations[0] : d.driver_locations;

  const totalReq = d.total_requests || 0;
  const totalAcc = d.total_accepts || 0;
  const rawRar = totalReq > 0 ? (totalAcc / totalReq) : 1.0;
  const rar = Math.min(1, Math.max(0, parseFloat(rawRar)));
  const effectiveRar = totalReq < 10 ? 1.0 : rar;
  const rar_penalty  = 1 + RAR_PENALTY_FACTOR * (1 - effectiveRar);

  const pingAt      = loc?.updated_at ?? d._ping_at;
  const gps_penalty = pingAt ? gpsStalenessMultiplier(pingAt, now) : 1.30;

  return {
    rar,
    effective_rar: effectiveRar,
    rar_penalty,
    gps_age_secs:  pingAt ? Math.round((now - new Date(pingAt).getTime()) / 1000) : 999,
    gps_penalty,
    composite_score: distanceMeters * rar_penalty * gps_penalty,
  };
}

// ─────────────────────────────────────────────────────────────────────────────

class MatchingEngine extends EventEmitter {
  constructor() {
    super();
    // Map<rideId, { candidateIndex, radius, drivers, timeoutHandle, globalTimeout, ride }>
    this.activeSearches = new Map();
    this._io = null;
  }

  setIO(io) { this._io = io; }

  get io() { return this._io || require('../../../server').io || null; }

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
  // _findAndSend
  // ──────────────────────────────────────────────────────────────────────────────
  async _findAndSend(rideId) {
    const session = this.activeSearches.get(rideId);
    if (!session) return;

    const { ride } = session;
    let { radius, candidateIndex } = session;

    const { data: check } = await supabase
      .from('rides').select('status').eq('id', rideId).limit(1);
    if (!check?.[0] || check[0].status !== 'searching') {
      this._cleanup(rideId);
      return;
    }

    const candidates = await this._queryCandidates(ride.pickup_lat, ride.pickup_lng, radius);

    if (candidates.length === 0) {
      if (radius < MAX_RADIUS) {
        const newRadius = radius + RADIUS_STEP;
        logger.info('MatchingEngine — expanding radius', { rideId, from: radius, to: newRadius });
        session.radius = newRadius;
        session.candidateIndex = 0;
        session.drivers = [];
        return this._findAndSend(rideId);
      }
      return this._noDriversAvailable(rideId, ride.rider_id);
    }

    if (session.drivers.length === 0 || candidateIndex === 0) {
      session.drivers = candidates;
      candidateIndex = 0;
    }

    await this._sendToCandidate(rideId, candidates, candidateIndex);
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // _queryCandidates
  //
  // Returns a scored, sorted candidate list that includes:
  //
  //   Pool A — Idle drivers (is_online, not on any ride)
  //            Scored by: composite_score = distance × RAR_penalty × GPS_penalty
  //
  //   Pool B — Pre-dispatch drivers (Scenario 1 + Scenario 3)
  //            in_progress status AND within PRE_DISPATCH_THRESHOLD_KM of dropoff
  //            AND total customer wait ≤ MAX_OFFER_WAIT_MINS
  //            Scored by: composite_score uses (eta_to_finish + eta_to_pickup)
  //                       converted to an equivalent "virtual distance" so both
  //                       pools share the same sort key.
  //
  //   Both pools also carry RAR + GPS staleness penalties.
  // ──────────────────────────────────────────────────────────────────────────────
  async _queryCandidates(pickupLat, pickupLng, radiusMeters) {
    const tenMinsAgoMs = Date.now() - 10 * 60 * 1000; // 10-min staleness cutoff in ms
    const now = Date.now();

    // ── Fetch all online, verified, active drivers ──────────────────────────────
    // NOTE: Use a left join (no `!inner`) so drivers who just went online and
    // haven't sent their first location ping yet are still included.
    // Drivers without a location row get GPS staleness penalty x1.30 (max penalty)
    // which pushes them to the back of the queue — but they are NOT excluded.
    //
    // IMPORTANT: Do NOT use .or() with a foreign-table column (driver_locations.*)
    // in PostgREST — it silently excludes all rows that have a location record,
    // resulting in zero candidates. Staleness filtering is done in JS below.
    const { data: rows, error } = await supabase
      .from('drivers')
      .select(`
        id, name, phone, fcm_token, vehicle_type, vehicle_reg_no,
        vehicle_color, vehicle_model, language_pref,
        total_accepts, total_requests,
        driver_locations(lat, lng, updated_at)
      `)
      .eq('is_online', true)
      .eq('is_active', true)
      .eq('gender_verified', true)
      .eq('verification_status', 'approved');

    if (error || !rows) {
      logger.error('MatchingEngine._queryCandidates — DB error', { error });
      return [];
    }


    // ── Fetch active rides — split by status ────────────────────────────────────
    // Statuses that permanently block a driver from being dispatched:
    //   assigned, driver_en_route, arrived  — driver hasn't even started the trip
    // Status that MAY allow pre-dispatch:
    //   in_progress — driver is inside the trip and may be near the dropoff
    const { data: activeRides } = await supabase
      .from('rides')
      .select('driver_id, status, drop_lat, drop_lng')
      .in('status', ['assigned', 'driver_en_route', 'arrived', 'in_progress'])
      .not('driver_id', 'is', null);

    const hardBusyIds = new Set();   // definitely unavailable
    // Map<driverId, { drop_lat, drop_lng }> for in-progress trips
    const inProgressMap = new Map();

    for (const r of (activeRides || [])) {
      if (r.status === 'in_progress') {
        inProgressMap.set(r.driver_id, { drop_lat: r.drop_lat, drop_lng: r.drop_lng });
      } else {
        hardBusyIds.add(r.driver_id);   // assigned/en_route/arrived — hard block
      }
    }

    // ── Fetch blocked drivers ────────────────────────────────────────────────────
    const { data: blockedRows } = await supabase
      .from('driver_blocks')
      .select('driver_id')
      .gt('blocked_until', new Date().toISOString());
    const blockedIds = new Set((blockedRows || []).map((r) => r.driver_id));

    // ── Score and collect candidates ─────────────────────────────────────────────
    const candidates = [];

    for (const d of rows) {
      if (blockedIds.has(d.id) || hardBusyIds.has(d.id)) continue;

      const loc = Array.isArray(d.driver_locations) ? d.driver_locations[0] : d.driver_locations;

      // ── SCENARIO 1 + 3: Pre-Dispatch eligible (in_progress driver) ─────────────
      if (inProgressMap.has(d.id)) {
        // Pre-dispatch requires known location — skip if no GPS record
        if (!loc || loc.lat == null || loc.lng == null) continue;

        const dropoff = inProgressMap.get(d.id);

        // Distance from driver's current location to THEIR dropoff
        const distToDropoffM = haversine(loc.lat, loc.lng, dropoff.drop_lat, dropoff.drop_lng);
        const distToDropoffKm = distToDropoffM / 1000;

        // Only include if driver is within the pre-dispatch threshold
        if (distToDropoffKm > PRE_DISPATCH_THRESHOLD_KM) continue;

        // ETA to finish current ride (driver → their dropoff)
        const etaToFinishMin = estimateEtaMin(distToDropoffKm);

        // ETA from their dropoff to the NEW pickup  (Scenario 3: minimize wait)
        const distDropoffToNewPickupM  = haversine(dropoff.drop_lat, dropoff.drop_lng, pickupLat, pickupLng);
        const distDropoffToNewPickupKm = distDropoffToNewPickupM / 1000;
        const etaFromDropoffToPickupMin = estimateEtaMin(distDropoffToNewPickupKm);

        // Total customer wait = finish time + travel to new pickup
        const totalWaitMin = etaToFinishMin + etaFromDropoffToPickupMin;

        // Scenario 3: skip if customer wait is too long
        if (totalWaitMin > MAX_OFFER_WAIT_MINS) continue;

        // Convert total wait to a "virtual distance" so it shares the composite_score axis.
        // At avg speed: distanceM = waitMin × AVG_URBAN_SPEED_KMH × 1000 / 60
        const virtualDistanceM = totalWaitMin * AVG_URBAN_SPEED_KMH * 1000 / 60;

        // NEW PICKUP must also be reachable (dropoff→pickup within effective radius)
        if (distDropoffToNewPickupM > radiusMeters) continue;

        const score = computeDriverScore(d, virtualDistanceM, now);

        candidates.push({
          ...d,
          lat: loc.lat,
          lng: loc.lng,
          distance_meters:   distDropoffToNewPickupM,
          is_pre_dispatch:   true,
          eta_to_finish_min: Math.round(etaToFinishMin),
          total_wait_min:    Math.round(totalWaitMin),
          ...score,
        });

        logger.debug('MatchingEngine — pre-dispatch candidate', {
          driverId: d.id, distToDropoffKm: distToDropoffKm.toFixed(2),
          totalWaitMin: totalWaitMin.toFixed(1), score: score.composite_score.toFixed(0),
        });
        continue;
      }

      // ── POOL A: Idle driver (not on any ride) ───────────────────────────────────
      // If driver has no location record yet (just went online), use a fallback
      // distance that puts them at the edge of the current radius so they rank
      // last but are still reachable by the customer.
      let distance_meters;
      if (!loc || loc.lat == null || loc.lng == null) {
        // No GPS yet — treat as being at radius boundary (will rank last due to gps_penalty=1.30)
        distance_meters = radiusMeters * 0.9;
        logger.info('MatchingEngine — driver has no location record, using fallback distance', { driverId: d.id });
      } else {
        // JS-side staleness filter: skip drivers whose GPS is older than 10 minutes
        if (loc.updated_at && new Date(loc.updated_at).getTime() < tenMinsAgoMs) continue;
        distance_meters = haversine(pickupLat, pickupLng, loc.lat, loc.lng);
        if (distance_meters > radiusMeters) continue;
      }

      const score = computeDriverScore(d, distance_meters, now);

      candidates.push({
        ...d,
        lat: loc.lat,
        lng: loc.lng,
        distance_meters,
        is_pre_dispatch: false,
        eta_to_finish_min: 0,
        total_wait_min: Math.round(estimateEtaMin(distance_meters / 1000)),
        ...score,
      });
    }

    // Sort ascending by composite_score: idle + close + reliable + fresh GPS first
    return candidates.sort((a, b) => a.composite_score - b.composite_score);
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // _checkSubscriptionConflict — Scenario 2
  //
  // Returns true if offering this driver a new ride would make them late for
  // an upcoming scheduled subscription ride.
  //
  // Logic:
  //   1. Look up any subscription ride for this driver in the next SUBSCRIPTION_BUFFER_MINS
  //   2. Estimate: time to reach NEW pickup + estimated NEW trip duration
  //   3. From new dropoff, estimate travel to subscription pickup
  //   4. If (arrival at sub pickup) > (sub scheduled_at) → CONFLICT → skip driver
  // ──────────────────────────────────────────────────────────────────────────────
  async _checkSubscriptionConflict(driverId, driverLat, driverLng, newRide) {
    try {
      const windowEnd = new Date(Date.now() + SUBSCRIPTION_BUFFER_MINS * 60 * 1000).toISOString();

      // Try the most common subscription ride table name — fail silently
      const { data: subRides, error } = await supabase
        .from('subscription_rides')
        .select('id, scheduled_date, scheduled_time, pickup_lat, pickup_lng, pickup_address')
        .eq('driver_id', driverId)
        .in('status', ['scheduled', 'confirmed', 'pending'])
        .gte('scheduled_date', new Date().toISOString().slice(0, 10))
        .order('scheduled_date', { ascending: true })
        .limit(1);

      if (error || !subRides?.length) return false;   // no upcoming sub ride → no conflict

      const sub = subRides[0];

      // Build subAt from scheduled_date + scheduled_time (e.g. "2026-04-05" + "09:00")
      const subAt = sub.scheduled_date && sub.scheduled_time
        ? new Date(`${sub.scheduled_date}T${sub.scheduled_time}:00`).getTime()
        : null;

      if (!subAt || isNaN(subAt)) return false;   // can't parse time → allow dispatch

      const nowMs = Date.now();

      // Only block if the sub ride is within the SUBSCRIPTION_BUFFER_MINS window
      if (subAt - nowMs > SUBSCRIPTION_BUFFER_MINS * 60 * 1000) return false;

      // Step A: estimate how long the new ride itself will take
      // (driver → new pickup → new dropoff)
      const driverToNewPickupKm  = haversine(driverLat, driverLng, newRide.pickup_lat, newRide.pickup_lng) / 1000;
      const newTripDistanceKm    = parseFloat(newRide.distance_km) || 5; // fallback 5 km if unknown
      const estimatedNewTripMin  = estimateEtaMin(driverToNewPickupKm) + estimateEtaMin(newTripDistanceKm);

      // Step B: from new dropoff, estimate travel to subscription pickup
      // We don't have the new dropoff coords here but we can use distance_km as proxy.
      // Approximate new dropoff position = new pickup + distance in direction toward pickup.
      // Forward-estimate: from pickup travel assumed straight at bearing (imprecise but safe).
      // Use pickup coord as conservative worst-case (same location = 0 extra travel).
      const subPickupDistKm = haversine(
        newRide.pickup_lat, newRide.pickup_lng,
        sub.pickup_lat, sub.pickup_lng,
      ) / 1000;
      const etaToSubPickupMin = estimateEtaMin(subPickupDistKm);

      // Total estimated arrival at sub pickup from now
      const totalMinFromNow = estimatedNewTripMin + etaToSubPickupMin;
      const estimatedArrivalMs = nowMs + totalMinFromNow * 60 * 1000;

      const hasConflict = estimatedArrivalMs > subAt;

      if (hasConflict) {
        logger.info('MatchingEngine._checkSubscriptionConflict — skip driver, sub ride conflict', {
          driverId,
          subAt: new Date(subAt).toISOString(),
          estimatedArrival: new Date(estimatedArrivalMs).toISOString(),
          overlapMin: Math.round((estimatedArrivalMs - subAt) / 60000),
          subAddress: sub.pickup_address,
        });
      }

      return hasConflict;
    } catch (err) {
      // Non-fatal — if subscription table doesn't exist or query fails, allow dispatch
      logger.warn('MatchingEngine._checkSubscriptionConflict — non-fatal error', { driverId, error: err.message });
      return false;
    }
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // _sendToCandidate — STEP 4
  // ──────────────────────────────────────────────────────────────────────────────
  async _sendToCandidate(rideId, candidates, index) {
    const session = this.activeSearches.get(rideId);
    if (!session) return;

    if (index >= candidates.length) {
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

    // ── Re-check driver is still online ────────────────────────────────────────
    const { data: driverCheck } = await supabase
      .from('drivers').select('is_online').eq('id', driver.id).limit(1);
    if (!driverCheck?.[0]?.is_online) {
      session.candidateIndex = index + 1;
      return this._sendToCandidate(rideId, candidates, index + 1);
    }

    // ── SCENARIO 2: Subscription conflict check ─────────────────────────────────
    const hasConflict = await this._checkSubscriptionConflict(
      driver.id,
      driver.lat,
      driver.lng,
      ride,
    );
    if (hasConflict) {
      logger.info('MatchingEngine._sendToCandidate — skipping driver (subscription conflict)', {
        rideId, driverId: driver.id,
      });
      session.candidateIndex = index + 1;
      return this._sendToCandidate(rideId, candidates, index + 1);
    }

    // ── Build request payload ──────────────────────────────────────────────────
    const requestPayload = {
      ride_id:           rideId,
      pickup_address:    ride.pickup_address,
      drop_address:      ride.drop_address,
      distance_km:       ride.distance_km,
      estimated_fare:    ride.estimated_fare,
      rider_name:        ride.rider_name,
      pickup_lat:        ride.pickup_lat,
      pickup_lng:        ride.pickup_lng,
      timeout_seconds:   30,
      // ── Dispatch quality + pre-dispatch metadata ──────────────────────────
      driver_distance_m:    Math.round(driver.distance_meters),
      driver_rar:           parseFloat((driver.rar || 1).toFixed(2)),
      driver_gps_age_s:     driver.gps_age_secs ?? 0,
      // Scenario 1 + 3: pre-dispatch flag tells driver app to show "after current ride" UI
      is_pre_dispatch:      driver.is_pre_dispatch ?? false,
      eta_to_finish_min:    driver.eta_to_finish_min ?? 0,
      total_wait_min:       driver.total_wait_min ?? 0,
    };

    this._emitToDriver(driver.id, 'ride_request', requestPayload);

    fcmService.sendRideRequest(driver.id, {
      title: driver.is_pre_dispatch
        ? 'Next Ride Ready (' + driver.eta_to_finish_min + ' min away)'
        : 'New Ride Request',
      body: (ride.pickup_address ?? '') + ' to ' + (ride.drop_address ?? 'Destination') + ' - Rs.' + (ride.estimated_fare ?? ''),
      data: {
        type:                  'RIDE_REQUEST',
        ride_id:               String(rideId),
        pickup_address:        String(ride.pickup_address  ?? ''),
        drop_address:          String(ride.drop_address    ?? ''),
        dropoff_address:       String(ride.drop_address    ?? ''),
        fare:                  String(ride.estimated_fare  ?? ''),
        estimated_fare:        String(ride.estimated_fare  ?? ''),
        rider_name:            String(ride.rider_name      ?? ''),
        rider_rating:          String(ride.rider_rating    ?? '4.5'),
        rider_photo:           String(ride.rider_photo     ?? ''),
        pickup_lat:            String(ride.pickup_lat      ?? ''),
        pickup_lng:            String(ride.pickup_lng      ?? ''),
        drop_lat:              String(ride.drop_lat        ?? ''),
        drop_lng:              String(ride.drop_lng        ?? ''),
        distance_km:           String(ride.distance_km     ?? ''),
        distance_to_pickup_km: String(parseFloat((driver.distance_meters / 1000).toFixed(1))),
        eta_to_pickup_min:     String(driver.total_wait_min ?? Math.round((driver.distance_meters / 1000 / 20) * 60)),
        is_pre_dispatch:       String(driver.is_pre_dispatch ?? false),
        eta_to_finish_min:     String(driver.eta_to_finish_min ?? 0),
        total_wait_min:        String(driver.total_wait_min    ?? 0),
        timeout_seconds:       '30',
      },
    }).catch((err) => logger.warn('MatchingEngine - FCM to driver failed', { error: err.message }));

    const timeoutHandle = setTimeout(() => {
      this._handleDriverTimeout(rideId, driver.id);
    }, DRIVER_TIMEOUT_MS);

    session.candidateIndex = index + 1;
    session.drivers = candidates;
    session.timeoutHandle = timeoutHandle;

    logger.info('MatchingEngine — request sent to driver', {
      rideId, driverId: driver.id, index,
      is_pre_dispatch: driver.is_pre_dispatch,
      composite_score: Math.round(driver.composite_score),
      rar: driver.rar,
      gps_age_secs: driver.gps_age_secs,
    });
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // _handleDriverTimeout — STEP 5
  // ──────────────────────────────────────────────────────────────────────────────
  _handleDriverTimeout(rideId, driverId) {
    const session = this.activeSearches.get(rideId);
    if (!session) return;

    logger.info('MatchingEngine — driver timeout', { rideId, driverId });
    this._emitToDriver(driverId, 'ride_request_expired', { ride_id: rideId });

    // RAR: timeout = implicit rejection — penalise acceptance rate
    supabase.rpc('increment_driver_rar', { p_driver_id: driverId, p_accepted: false })
      .then(({ error }) => {
        if (error) {
          supabase
            .from('drivers')
            .select('total_requests, total_accepts')
            .eq('id', driverId)
            .single()
            .then(({ data: d }) => {
              if (!d) return;
              const total_requests  = (d.total_requests || 0) + 1;
              const total_accepts   = d.total_accepts  || 0;
              const acceptance_rate = total_requests > 0
                ? parseFloat((total_accepts / total_requests).toFixed(4)) : 1.0;
              return supabase.from('drivers')
                .update({ total_requests, acceptance_rate }).eq('id', driverId);
            })
            .catch((err) => logger.warn('MatchingEngine — RAR timeout fallback failed', { driverId, error: err.message }));
        }
      })
      .catch((e) => logger.error('MatchingEngine rpc error', { error: e.message }));

    const { drivers, candidateIndex } = session;
    this._sendToCandidate(rideId, drivers, candidateIndex)
      .catch((err) => logger.error('MatchingEngine._handleDriverTimeout — error', { error: err.message }));
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // handleDriverAccept(rideId, driverId)
  // ──────────────────────────────────────────────────────────────────────────────
  async handleDriverAccept(rideId, driverId) {
    try {
      const session = this.activeSearches.get(rideId);

      const { data: rides } = await supabase
        .from('rides').select('status, rider_id, ride_start_pin').eq('id', rideId).limit(1);
      const ride = rides?.[0];
      if (!ride || ride.status !== 'searching') {
        this._emitToDriver(driverId, 'ride_already_assigned', { ride_id: rideId });
        return;
      }

      // Guard: driver must not already be on ANY non-completable active ride
      // Exception: pre-dispatch drivers are in_progress — that's allowed.
      // They are allowed to accept but the ride is queued (handled client-side).
      const { data: hardActiveRides } = await supabase
        .from('rides')
        .select('id, status')
        .eq('driver_id', driverId)
        .in('status', ['assigned', 'driver_en_route', 'arrived'])
        .limit(1);

      if (hardActiveRides?.length) {
        logger.warn('MatchingEngine.handleDriverAccept — driver on non-completable ride', { rideId, driverId });
        this._emitToDriver(driverId, 'ride_already_assigned', { ride_id: rideId, reason: 'already_on_ride' });
        return;
      }

      if (session?.timeoutHandle) clearTimeout(session.timeoutHandle);

      // Optimistic-lock: only succeeds if ride still 'searching'
      const { data: updated, error } = await supabase
        .from('rides')
        .update({ driver_id: driverId, status: 'assigned' })
        .eq('id', rideId)
        .eq('status', 'searching')
        .select('id');

      if (error || !updated?.length) {
        logger.warn('MatchingEngine.handleDriverAccept — race condition', { rideId, driverId });
        this._emitToDriver(driverId, 'ride_already_assigned', { ride_id: rideId });
        return;
      }

      // RAR: accepted — update score upward
      supabase.rpc('increment_driver_rar', { p_driver_id: driverId, p_accepted: true })
        .catch(() => {
          supabase
            .from('drivers')
            .select('total_requests, total_accepts')
            .eq('id', driverId)
            .single()
            .then(({ data: d }) => {
              if (!d) return;
              const total_requests  = (d.total_requests || 0) + 1;
              const total_accepts   = (d.total_accepts  || 0) + 1;
              const acceptance_rate = total_requests > 0
                ? parseFloat((total_accepts / total_requests).toFixed(4)) : 1.0;
              return supabase.from('drivers')
                .update({ total_requests, total_accepts, acceptance_rate }).eq('id', driverId);
            })
            .catch((err) => logger.warn('MatchingEngine — RAR accept fallback failed', { driverId, error: err.message }));
        });

      this._cleanup(rideId);

      const { data: drivers } = await supabase
        .from('drivers')
        .select('id, name, phone, vehicle_type, vehicle_reg_no, vehicle_color, vehicle_model, profile_photo_url, upi_id')
        .eq('id', driverId).limit(1);
      const driver = drivers?.[0] || { id: driverId };

      this._emitToRide(rideId, 'ride_assigned', { ride_id: rideId, driver, status: 'assigned', ride_start_pin: ride.ride_start_pin });
      this._emitToRider(ride.rider_id, 'ride_assigned', { ride_id: rideId, driver, status: 'assigned', ride_start_pin: ride.ride_start_pin });

      fcmService.sendToUser(ride.rider_id, 'rider', {
        title: 'Driver Found! 🚗',
        body: `${driver.name || 'Your driver'} is on the way.`,
        data: { type: 'RIDE_ASSIGNED', driver_id: driverId, driver_name: driver.name || '', vehicle: driver.vehicle_model || '' },
      }).catch(() => {});

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
  // handleDriverReject(rideId, driverId, opts?)
  // opts.skipRar=true → re-dispatch without penalising acceptance rate (used by snooze)
  // ──────────────────────────────────────────────────────────────────────────────
  async handleDriverReject(rideId, driverId, { skipRar = false } = {}) {
    const session = this.activeSearches.get(rideId);
    if (!session) return;

    logger.info('MatchingEngine.handleDriverReject', { rideId, driverId, skipRar });
    if (session.timeoutHandle) clearTimeout(session.timeoutHandle);

    // RAR: explicit rejection — penalise acceptance rate downward
    // Skipped when called from snooze (skipRar=true)
    if (!skipRar) {
      supabase.rpc('increment_driver_rar', { p_driver_id: driverId, p_accepted: false })
        .catch(() => {
          supabase
            .from('drivers')
            .select('total_requests, total_accepts')
            .eq('id', driverId)
            .single()
            .then(({ data: d }) => {
              if (!d) return;
              const total_requests  = (d.total_requests || 0) + 1;
              const total_accepts   = d.total_accepts  || 0;
              const acceptance_rate = total_requests > 0
                ? parseFloat((total_accepts / total_requests).toFixed(4)) : 1.0;
              return supabase.from('drivers')
                .update({ total_requests, acceptance_rate }).eq('id', driverId);
            })
            .catch((err) => logger.warn('MatchingEngine — RAR reject fallback failed', { driverId, error: err.message }));
        });
    }

    const { drivers, candidateIndex } = session;
    await this._sendToCandidate(rideId, drivers, candidateIndex);
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // handleDriverSnooze(rideId, driverId)
  // Re-dispatch to next driver without any RAR penalty.
  // ──────────────────────────────────────────────────────────────────────────────
  async handleDriverSnooze(rideId, driverId) {
    return this.handleDriverReject(rideId, driverId, { skipRar: true });
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // cancelSearch(rideId)
  // ──────────────────────────────────────────────────────────────────────────────
  cancelSearch(rideId) {
    const session = this.activeSearches.get(rideId);
    if (!session) return;

    if (session.timeoutHandle) clearTimeout(session.timeoutHandle);
    if (session.globalTimeout) clearTimeout(session.globalTimeout);

    const { drivers, candidateIndex } = session;
    const currentDriver = drivers?.[Math.max(0, candidateIndex - 1)];
    if (currentDriver) {
      this._emitToDriver(currentDriver.id, 'ride_cancelled', { ride_id: rideId });
    }

    this.activeSearches.delete(rideId);
    logger.info('MatchingEngine.cancelSearch — search cancelled', { rideId });
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // _noDriversAvailable
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

    // ── Consecutive-fail tracking ───────────────────────────────────────────────
    try {
      const { data: riderRows } = await supabase
        .from('users')
        .select('consecutive_fail_count')
        .eq('id', riderId)
        .limit(1);

      const prev   = riderRows?.[0]?.consecutive_fail_count ?? 0;
      const newCnt = prev + 1;

      if (newCnt >= 3) {
        // Grant free ride and reset counter
        await supabase.from('users').update({
          consecutive_fail_count: 0,
          free_ride_eligible: true,
        }).eq('id', riderId);
        logger.info('MatchingEngine — free ride granted after 3 consecutive fails', { riderId });
      } else {
        await supabase.from('users').update({ consecutive_fail_count: newCnt }).eq('id', riderId);
      }
    } catch (trackErr) {
      logger.warn('MatchingEngine — consecutive fail tracking error', { riderId, error: trackErr.message });
    }

    logger.info('MatchingEngine — no drivers available', { rideId });
  }


  // ──────────────────────────────────────────────────────────────────────────────
  // _cleanup
  // ──────────────────────────────────────────────────────────────────────────────
  _cleanup(rideId) {
    const session = this.activeSearches.get(rideId);
    if (!session) return;
    if (session.timeoutHandle) clearTimeout(session.timeoutHandle);
    if (session.globalTimeout) clearTimeout(session.globalTimeout);
    this.activeSearches.delete(rideId);
  }
}

module.exports = new MatchingEngine();
