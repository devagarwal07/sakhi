'use strict';

const { z } = require('zod');
const jwt    = require('jsonwebtoken');
const path   = require('path');
const sosService     = require('../services/sosService');
const callingService = require('../services/callingService');
const smsService     = require('../services/smsService');
const supabase       = require('../config/supabase');
const AppError       = require('../utils/AppError');
const logger         = require('../utils/logger');

function handleError(err, res, next) {
  if (err.name === 'ZodError') {
    return res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid input.', details: err.flatten() } });
  }
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: { code: err.code, message: err.message, details: err.details } });
  }
  return next(err);
}

// ── POST /safety/sos ──────────────────────────────────────────────────────────
const sosSchema = z.object({
  ride_id: z.string().uuid().optional(),
  lat:     z.number().min(-90).max(90),
  lng:     z.number().min(-180).max(180),
});

async function triggerSOS(req, res, next) {
  try {
    const { ride_id, lat, lng } = sosSchema.parse(req.body);
    const { userId, role } = req.user;

    // Item 10 — Block SOS on terminal ride statuses
    if (ride_id) {
      const { data: rideRows } = await supabase
        .from('rides')
        .select('status')
        .eq('id', ride_id)
        .limit(1);

      const rideStatus = rideRows?.[0]?.status;
      if (rideStatus && ['completed', 'cancelled', 'no_drivers_available'].includes(rideStatus)) {
        return res.status(422).json({
          error: {
            code:    'RIDE_NOT_ACTIVE',
            message: 'SOS can only be triggered during an active ride.',
            details: { ride_id, status: rideStatus },
          },
        });
      }
    }

    const result = await sosService.triggerSOS(userId, role, ride_id || null, lat, lng);
    return res.status(201).json(result);
  } catch (err) { return handleError(err, res, next); }
}

// ── GET /safety/emergency-contacts ───────────────────────────────────────────
async function getEmergencyContacts(req, res, next) {
  try {
    const { userId, role } = req.user;
    const table = role === 'rider' ? 'emergency_contacts' : 'driver_emergency_contacts';
    const ownerCol = role === 'rider' ? 'user_id' : 'driver_id';
    const { data, error } = await supabase
      .from(table)
      .select('id, name, phone, relation, auto_share')
      .eq(ownerCol, userId)
      .order('created_at', { ascending: true });

    if (error) throw new AppError('Failed to fetch contacts.', 500, 'DB_ERROR');
    return res.status(200).json({ contacts: data || [] });
  } catch (err) { return handleError(err, res, next); }
}

// ── POST /safety/emergency-contacts ──────────────────────────────────────────
const contactSchema = z.object({
  name:     z.string().min(1).max(100),
  phone:    z.string().min(10).max(15),
  relation: z.string().min(1).max(50),
  auto_share: z.boolean().optional(),
});

async function addEmergencyContact(req, res, next) {
  try {
    const body = contactSchema.parse(req.body);
    const { userId, role } = req.user;
    const table = role === 'rider' ? 'emergency_contacts' : 'driver_emergency_contacts';
    const ownerCol = role === 'rider' ? 'user_id' : 'driver_id';

    const { count } = await supabase
      .from(table)
      .select('id', { count: 'exact', head: true })
      .eq(ownerCol, userId);

    if (count >= 3) {
      throw new AppError('Maximum 3 emergency contacts allowed.', 422, 'MAX_CONTACTS_REACHED');
    }

    const insertPayload = role === 'rider' ? { user_id: userId, ...body } : { driver_id: userId, ...body };
    const { data, error } = await supabase
      .from(table)
      .insert(insertPayload)
      .select('id, name, phone, relation, auto_share')
      .single();

    if (error) throw new AppError('Failed to save contact.', 500, 'DB_ERROR');
    return res.status(201).json(data);
  } catch (err) { return handleError(err, res, next); }
}

// ── PUT /safety/emergency-contacts/:id ───────────────────────────────────────
async function updateEmergencyContact(req, res, next) {
  try {
    const body = contactSchema.parse(req.body);
    const { userId, role } = req.user;
    const table = role === 'rider' ? 'emergency_contacts' : 'driver_emergency_contacts';
    const ownerCol = role === 'rider' ? 'user_id' : 'driver_id';

    const { data, error } = await supabase
      .from(table)
      .update(body)
      .eq('id', req.params.id)
      .eq(ownerCol, userId)
      .select('id, name, phone, relation, auto_share')
      .single();

    if (error) throw new AppError('Failed to update contact.', 500, 'DB_ERROR');
    return res.status(200).json(data);
  } catch (err) { return handleError(err, res, next); }
}

// ── DELETE /safety/emergency-contacts/:id ─────────────────────────────────────
async function deleteEmergencyContact(req, res, next) {
  try {
    const { userId, role } = req.user;
    const table = role === 'rider' ? 'emergency_contacts' : 'driver_emergency_contacts';
    const ownerCol = role === 'rider' ? 'user_id' : 'driver_id';

    const { data } = await supabase
      .from(table)
      .select('id')
      .eq('id', req.params.id)
      .eq(ownerCol, userId)
      .limit(1);

    if (!data?.length) throw new AppError('Contact not found.', 404, 'NOT_FOUND');

    await supabase.from(table).delete().eq('id', req.params.id);
    return res.status(200).json({ success: true });
  } catch (err) { return handleError(err, res, next); }
}

// ── POST /safety/sos/cancel ───────────────────────────────────────────────────
async function cancelSOS(req, res, next) {
  try {
    const { userId, role } = req.user;
    const { data: rows } = await supabase
      .from('sos_events')
      .select('id, ride_id')
      .eq('user_id', userId)
      .eq('triggered_by', role)
      .is('resolved_at', null)
      .order('created_at', { ascending: false })
      .limit(1);

    if (rows?.[0]) {
      await supabase
        .from('sos_events')
        .update({ resolved_at: new Date().toISOString() })
        .eq('id', rows[0].id);
        
      if (rows[0].ride_id) {
        await supabase
          .from('rides')
          .update({ sos_triggered: false })
          .eq('id', rows[0].ride_id);
      }
    }
    return res.status(200).json({ ok: true });
  } catch (err) { return handleError(err, res, next); }
}

// ── POST /safety/share-trip/:ride_id ─────────────────────────────────────────
async function shareTrip(req, res, next) {
  try {
    const { ride_id } = req.params;
    const riderId = req.user.userId;

    const { data: rides } = await supabase
      .from('rides')
      .select('id, rider_id, status')
      .eq('id', ride_id)
      .limit(1);

    const ride = rides?.[0];
    if (!ride) throw new AppError('Ride not found.', 404, 'RIDE_NOT_FOUND');
    if (ride.rider_id !== riderId) throw new AppError('Forbidden.', 403, 'FORBIDDEN');

    const activeStatuses = ['searching', 'assigned', 'driver_en_route', 'arrived', 'in_progress'];
    if (!activeStatuses.includes(ride.status)) {
      throw new AppError('Can only share an active ride.', 409, 'RIDE_NOT_ACTIVE');
    }

    const token = jwt.sign(
      { ride_id, type: 'live_track' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    const baseUrl  = process.env.BASE_URL || 'https://sakhirides.in';
    const shareUrl = `${baseUrl}/track/${token}`;

    // ── SMS the tracking link to all emergency contacts ───────────────────────
    const [{ data: userRows }, { data: contacts }] = await Promise.all([
      supabase.from('users').select('name').eq('id', riderId).limit(1),
      supabase.from('emergency_contacts').select('phone, name').eq('user_id', riderId).limit(3),
    ]);

    const userName = userRows?.[0]?.name || 'A Sakhi user';
    const smsText  = `SAKHI MOBILITY: ${userName} shared live ride tracking. Please track here: SakhiApp`;

    const notifiedPhones = [];
    await Promise.all(
      (contacts || []).map(async (c) => {
        try {
          await smsService.sendSMS(c.phone, smsText, smsService.FORTIUS_TEMPLATES.SAKHI_TRACK_SHORT);
          notifiedPhones.push(c.phone);
        } catch (smsErr) {
          logger.warn('safetyController.shareTrip — SMS failed', { phone: c.phone, error: smsErr.message });
        }
      })
    );

    logger.info('safetyController.shareTrip — link shared', {
      ride_id, riderId, contacts_sms_count: notifiedPhones.length,
    });

    return res.status(200).json({
      share_url:         shareUrl,
      expires_in:        '24 hours',
      contacts_notified: notifiedPhones.length,
    });
  } catch (err) { return handleError(err, res, next); }
}

// ── GET /track/:token (PUBLIC) — serves the live tracking HTML page ───────────
async function getLiveTrack(req, res, next) {
  try {
    const { token } = req.params;
    // Lightly validate the token; expired tokens still get the page
    // (the page's JS will show the expired UI via the /api/track endpoint).
    try {
      const p = jwt.verify(token, process.env.JWT_SECRET);
      if (p.type !== 'live_track') {
        return res.status(400).send('<h2 style="font-family:sans-serif">Invalid tracking link.</h2>');
      }
    } catch (err) {
      if (err.name !== 'TokenExpiredError') {
        return res.status(400).send('<h2 style="font-family:sans-serif">Invalid tracking link.</h2>');
      }
      // Expired — still serve the page; it will show the expiry state
    }
    return res.sendFile(path.join(__dirname, '../../public/track.html'));
  } catch (err) { return handleError(err, res, next); }
}

// ── GET /api/track/:token (PUBLIC JSON) — polling endpoint for the tracking page
async function getLiveTrackData(req, res, next) {
  try {
    const { token } = req.params;

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(410).json({ error: { code: 'LINK_EXPIRED', message: 'This tracking link has expired.' } });
      }
      return res.status(400).json({ error: { code: 'INVALID_TOKEN', message: 'Invalid tracking link.' } });
    }

    if (payload.type !== 'live_track') {
      return res.status(400).json({ error: { code: 'INVALID_TOKEN', message: 'Invalid tracking link.' } });
    }

    const { ride_id } = payload;

    const { data: rides } = await supabase
      .from('rides')
      .select(`
        id, status, pickup_address, drop_address,
        pickup_lat, pickup_lng, drop_lat, drop_lng,
        drivers(id, name, vehicle_type, vehicle_model, vehicle_reg_no, vehicle_color, profile_photo_url)
      `)
      .eq('id', ride_id)
      .limit(1);

    const ride = rides?.[0];
    if (!ride) return res.status(404).json({ error: { code: 'RIDE_NOT_FOUND', message: 'Ride not found.' } });

    // Get latest driver location
    let driverLocation = null;
    if (ride.drivers?.id) {
      const { data: loc } = await supabase
        .from('driver_locations')
        .select('lat, lng, updated_at')
        .eq('driver_id', ride.drivers.id)
        .limit(1);
      driverLocation = loc?.[0] || null;
    }

    return res.status(200).json({
      ride_id:         ride.id,
      status:          ride.status,
      driver_location: driverLocation,
      pickup_address:  ride.pickup_address,
      drop_address:    ride.drop_address,
      pickup_lat:      ride.pickup_lat  || null,
      pickup_lng:      ride.pickup_lng  || null,
      drop_lat:        ride.drop_lat    || null,
      drop_lng:        ride.drop_lng    || null,
      driver_name:     ride.drivers?.name || null,
      vehicle_details: ride.drivers ? {
        type:   ride.drivers.vehicle_type,
        model:  ride.drivers.vehicle_model,
        reg_no: ride.drivers.vehicle_reg_no,
        color:  ride.drivers.vehicle_color,
        photo:  ride.drivers.profile_photo_url,
      } : null,
    });
  } catch (err) { return handleError(err, res, next); }
}

// ── POST /safety/call/:ride_id ──────────────────────────────────────────────────────────────────────────────
const callSchema = z.object({
  // direction is optional — if not provided we infer it from role
  direction: z.enum(['rider_to_driver', 'driver_to_rider']).optional(),
});

async function initiateCall(req, res, next) {
  try {
    const { direction: requestedDirection } = callSchema.parse(req.body);
    // Infer direction from the caller's role if not explicitly provided
    const direction = requestedDirection ?? (req.user.role === 'rider' ? 'rider_to_driver' : 'driver_to_rider');
    const result = await callingService.resolveCallNumber(
      req.params.ride_id,
      req.user.userId,
      req.user.role,
      direction
    );
    // Return the phone number — client opens tel: link directly
    return res.status(200).json({ phone: result.phone });
  } catch (err) { return handleError(err, res, next); }
}

// ── POST /safety/battery-low ──────────────────────────────────────────────────
const batterySchema = z.object({
  level: z.number().int().min(0).max(100),
  lat:   z.number().min(-90).max(90),
  lng:   z.number().min(-180).max(180),
});

async function batteryLow(req, res, next) {
  try {
    const { level, lat, lng } = batterySchema.parse(req.body);
    const result = await sosService.handleBatteryLow(req.user.userId, req.user.role, level, lat, lng);
    return res.status(200).json(result);
  } catch (err) { return handleError(err, res, next); }
}

module.exports = {
  triggerSOS,
  cancelSOS,
  getEmergencyContacts,
  addEmergencyContact,
  updateEmergencyContact,
  deleteEmergencyContact,
  shareTrip,
  getLiveTrack,
  getLiveTrackData,
  initiateCall,
  batteryLow,
};
