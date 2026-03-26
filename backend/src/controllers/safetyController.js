'use strict';

const { z } = require('zod');
const jwt = require('jsonwebtoken');
const sosService = require('../services/sosService');
const callingService = require('../services/callingService');
const supabase = require('../config/supabase');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

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

    const result = await sosService.triggerSOS(userId, role, ride_id || null, lat, lng);
    return res.status(201).json(result);
  } catch (err) { return handleError(err, res, next); }
}

// ── GET /safety/emergency-contacts ───────────────────────────────────────────
async function getEmergencyContacts(req, res, next) {
  try {
    const { data, error } = await supabase
      .from('emergency_contacts')
      .select('id, name, phone, relation')
      .eq('user_id', req.user.userId)
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
});

async function addEmergencyContact(req, res, next) {
  try {
    const body = contactSchema.parse(req.body);
    const userId = req.user.userId;

    // Max 3 contacts
    const { count } = await supabase
      .from('emergency_contacts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (count >= 3) {
      throw new AppError('Maximum 3 emergency contacts allowed.', 422, 'MAX_CONTACTS_REACHED');
    }

    const { data, error } = await supabase
      .from('emergency_contacts')
      .insert({ user_id: userId, ...body })
      .select('id, name, phone, relation')
      .single();

    if (error) throw new AppError('Failed to save contact.', 500, 'DB_ERROR');
    return res.status(201).json(data);
  } catch (err) { return handleError(err, res, next); }
}

// ── DELETE /safety/emergency-contacts/:id ─────────────────────────────────────
async function deleteEmergencyContact(req, res, next) {
  try {
    const userId = req.user.userId;

    const { data } = await supabase
      .from('emergency_contacts')
      .select('id')
      .eq('id', req.params.id)
      .eq('user_id', userId)
      .limit(1);

    if (!data?.length) throw new AppError('Contact not found.', 404, 'NOT_FOUND');

    await supabase.from('emergency_contacts').delete().eq('id', req.params.id);
    return res.status(200).json({ success: true });
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

    const baseUrl = process.env.BASE_URL || 'https://sakhirides.in';
    return res.status(200).json({
      share_url:  `${baseUrl}/track/${token}`,
      expires_in: '24 hours',
    });
  } catch (err) { return handleError(err, res, next); }
}

// ── GET /track/:token (PUBLIC) ────────────────────────────────────────────────
async function getLiveTrack(req, res, next) {
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

    // Fetch ride + driver + locations in parallel
    const [{ data: rides }, { data: locations }] = await Promise.all([
      supabase
        .from('rides')
        .select(`
          id, status, pickup_address, drop_address,
          drivers(id, name, vehicle_type, vehicle_model, vehicle_reg_no, vehicle_color, profile_photo_url)
        `)
        .eq('id', ride_id)
        .limit(1),
      supabase
        .from('rides')
        .select('driver_id')
        .eq('id', ride_id)
        .limit(1),
    ]);

    const ride = rides?.[0];
    if (!ride) throw new AppError('Ride not found.', 404, 'RIDE_NOT_FOUND');

    // Get driver location
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
      ride_id:        ride.id,
      status:         ride.status,
      driver_location: driverLocation,
      pickup_address: ride.pickup_address,
      drop_address:   ride.drop_address,
      driver_name:    ride.drivers?.name || null,
      vehicle_details: ride.drivers ? {
        type:    ride.drivers.vehicle_type,
        model:   ride.drivers.vehicle_model,
        reg_no:  ride.drivers.vehicle_reg_no,
        color:   ride.drivers.vehicle_color,
        photo:   ride.drivers.profile_photo_url,
      } : null,
    });
  } catch (err) { return handleError(err, res, next); }
}

// ── POST /safety/call/:ride_id ────────────────────────────────────────────────
const callSchema = z.object({
  direction: z.enum(['rider_to_driver', 'driver_to_rider']),
});

async function initiateCall(req, res, next) {
  try {
    const { direction } = callSchema.parse(req.body);
    const result = await callingService.initiateCall(
      req.params.ride_id,
      req.user.userId,
      req.user.role,
      direction
    );
    return res.status(200).json(result);
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
  getEmergencyContacts,
  addEmergencyContact,
  deleteEmergencyContact,
  shareTrip,
  getLiveTrack,
  initiateCall,
  batteryLow,
};
