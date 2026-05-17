'use strict';
/**
 * simulateRideRequest.js
 *
 * Simulates a real ride request from Priya Sharma that flows through the
 * matchingEngine, triggering a Socket.IO + FCM notification to the driver.
 *
 * Usage:
 *   node scripts/simulateRideRequest.js <driver_phone>
 *
 * Example:
 *   node scripts/simulateRideRequest.js +919876543210
 *   node scripts/simulateRideRequest.js 9876543210
 */

require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const jwt      = require('jsonwebtoken');
const axios    = require('axios');
const crypto   = require('crypto');
const supabase = require('../src/config/supabase');

const BACKEND_URL = 'https://sakhi-backend-pwej.onrender.com';
const JWT_SECRET  = process.env.JWT_SECRET;

// Priya Sharma — pre-verified test rider
const PRIYA_ID    = 'fa58f397-58ee-464a-8af7-426b9388d7d7';
const PRIYA_PHONE = '+919999999902';

async function main() {
  const rawPhone = process.argv[2];
  if (!rawPhone) {
    console.error('Usage: node scripts/simulateRideRequest.js <driver_phone>');
    console.error('Example: node scripts/simulateRideRequest.js 9876543210');
    process.exit(1);
  }

  // Normalise to +91XXXXXXXXXX regardless of how the number was passed in
  let normalised = rawPhone.replace(/\D/g, '');           // strip non-digits
  if (normalised.startsWith('91') && normalised.length === 12) normalised = normalised.slice(2);
  const driverPhone = `+91${normalised}`;

  console.log('='.repeat(60));
  console.log('  Sakhi — Ride Request Simulator');
  console.log('='.repeat(60));

  // ── 1. Find the driver ────────────────────────────────────────────────────
  // Try normalised form, raw input, and +prefixed variant as fallbacks.
  const phonesToTry = [driverPhone, rawPhone, `+${normalised}`];
  let driver = null;
  for (const ph of phonesToTry) {
    const { data } = await supabase
      .from('drivers').select('id, name, phone, fcm_token, total_accepts, total_requests').eq('phone', ph).limit(1);
    if (data?.[0]) { driver = data[0]; break; }
  }
  if (!driver) {
    console.error(`❌ Driver not found. Tried: ${phonesToTry.join(', ')}`);
    process.exit(1);
  }
  console.log(`✅ Driver found: "${driver.name}" (${driver.phone}) — ID: ${driver.id}`);
  console.log(`   FCM token : ${driver.fcm_token ? '✅ ' + driver.fcm_token.slice(0, 30) + '...' : '❌ NOT SET — FCM will fail'}`);
  const rar = driver.total_requests > 0 ? (driver.total_accepts / driver.total_requests).toFixed(2) : '1.00';
  console.log(`   RAR       : ${rar} (${driver.total_accepts}/${driver.total_requests} accepted)`);

  // ── 2. Set driver as fully online + approved ──────────────────────────────
  await supabase.from('drivers').update({
    is_online:           true,
    is_active:           true,
    verification_status: 'approved',
    gender_verified:     true,
  }).eq('id', driver.id);
  console.log('✅ Driver set: is_online=true, gender_verified=true, approved');

  // ── 3. Read driver's CURRENT GPS from driver_locations ───────────────────
  const { data: locRows } = await supabase
    .from('driver_locations').select('lat, lng, updated_at').eq('driver_id', driver.id).limit(1);
  const loc = locRows?.[0];

  let pickupLat, pickupLng;
  if (loc) {
    const ageMs = Date.now() - new Date(loc.updated_at).getTime();
    console.log(`📍 Driver GPS: ${loc.lat}, ${loc.lng} (age: ${Math.round(ageMs/1000)}s)`);
    pickupLat = loc.lat;
    pickupLng = loc.lng;
    // Refresh the GPS timestamp so it's within 5-min freshness window
    await supabase.from('driver_locations').upsert({
      driver_id:  driver.id,
      lat:        loc.lat,
      lng:        loc.lng,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'driver_id' });
    console.log('✅ GPS timestamp refreshed');
  } else {
    // No location yet — place driver at a default location
    pickupLat = 12.9716;
    pickupLng = 77.5946;
    await supabase.from('driver_locations').upsert({
      driver_id:  driver.id,
      lat:        pickupLat,
      lng:        pickupLng,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'driver_id' });
    console.log('⚠️  No GPS found — placed driver at Bengaluru default');
  }

  // ── 4. Verify Priya Sharma (rider) ───────────────────────────────────────
  await supabase.from('users').update({
    verification_status: 'approved',
    gender_verified:     true,
    is_active:           true,
  }).eq('id', PRIYA_ID);
  console.log('✅ Rider (Priya Sharma) verified');

  // ── 5. Cancel any active rides ────────────────────────────────────────────
  const { data: old } = await supabase
    .from('rides')
    .update({ status: 'cancelled', cancelled_by: 'rider' })
    .eq('rider_id', PRIYA_ID)
    .in('status', ['searching', 'assigned', 'driver_en_route', 'arrived', 'in_progress'])
    .select('id');
  if (old?.length) console.log(`🗑️  Cleared ${old.length} existing active ride(s)`);

  // ── 6. Pause 500ms so DB writes settle, then start keepalive ───────────────
  // KEY FIX: The backend socket-disconnect handler sets is_online=false when
  // no socket is connected. We keepalive the is_online=true flag every 2s so
  // the matching engine always finds the driver in _queryCandidates().
  await new Promise(r => setTimeout(r, 500));
  const keepalive = setInterval(async () => {
    try {
      // Keep driver online AND GPS fresh (matching engine requires GPS within 5 mins)
      await supabase.from('drivers').update({ is_online: true }).eq('id', driver.id);
      await supabase.from('driver_locations').upsert({
        driver_id:  driver.id,
        lat:        pickupLat,
        lng:        pickupLng,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'driver_id' });
    } catch (_) {}
  }, 2000);

  // ── 7. Issue JWT for Priya ────────────────────────────────────────────────
  const token = jwt.sign(
    { userId: PRIYA_ID, role: 'rider', phone: PRIYA_PHONE, jti: crypto.randomUUID() },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  // ── 8. Book the ride — pickup AT driver's location ────────────────────────
  const dropLat = pickupLat + 0.03;
  const dropLng = pickupLng + 0.03;

  // Re-assert online right before booking so matching engine is guaranteed to find driver
  await supabase.from('drivers').update({ is_online: true }).eq('id', driver.id);
  console.log('✅ Driver re-confirmed online before booking');

  console.log(`\n📡 Booking ride at driver's location:`);
  console.log(`   Pickup: ${pickupLat.toFixed(6)}, ${pickupLng.toFixed(6)}`);
  console.log(`   Drop:   ${dropLat.toFixed(6)}, ${dropLng.toFixed(6)}`);
  console.log(`   Backend: ${BACKEND_URL}`);

  let rideId;
  try {
    const response = await axios.post(
      `${BACKEND_URL}/rides`,
      {
        pickup_lat:     pickupLat,
        pickup_lng:     pickupLng,
        pickup_address: 'Your current location',
        drop_lat:       dropLat,
        drop_lng:       dropLng,
        drop_address:   'Test destination',
        payment_method: 'cash',
      },
      {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        timeout: 15000,
      }
    );

    rideId = response.data.ride_id;
    console.log(`\n✅ Ride created!`);
    console.log(`   Ride ID: ${rideId}`);
    console.log(`   Fare:    ₹${response.data.estimated_fare}`);
    console.log(`   Distance: ${response.data.distance_km} km`);
    console.log(`\n🔔 Matching engine running — check driver app NOW!`);
  } catch (err) {
    console.error('\n❌ Ride creation failed:');
    console.error(`   ${err.response?.status}: ${JSON.stringify(err.response?.data)}`);
    if (err.code === 'ECONNREFUSED') {
      console.error(`\n⚠️  Cannot connect to backend at ${BACKEND_URL}`);
      console.error('   Make sure backend is running: cd backend && node server.js');
    }
    process.exit(1);
  }

  // ── 9. Poll ride status for 35s to see if driver accepted ─────────────────
  console.log('\nPolling ride status...');
  for (let i = 0; i < 7; i++) {
    await new Promise(r => setTimeout(r, 5000));
    const { data: rows } = await supabase
      .from('rides').select('status, driver_id').eq('id', rideId).limit(1);
    const ride = rows?.[0];
    console.log(`   [${(i+1)*5}s] status: ${ride?.status}${ride?.driver_id ? ' → driver: ' + ride.driver_id : ''}`);
    if (ride?.status !== 'searching') break;
  }

  clearInterval(keepalive);
  process.exit(0);
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
