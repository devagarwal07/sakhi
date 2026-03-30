'use strict';

const { Router } = require('express');
const { z } = require('zod');
const crypto         = require('crypto');
const authMiddleware = require('../middleware/authMiddleware');
const roleGuard      = require('../middleware/roleGuard');
const supabase       = require('../config/supabase');
const fcmService     = require('../services/fcmService');
const smsService     = require('../services/smsService');
const logger         = require('../utils/logger');
const { adminLimiter } = require('../middleware/rateLimiter');

const router = Router();

// All admin routes: rate limit + auth + admin role
router.use(adminLimiter, authMiddleware, roleGuard('admin'));

// ── Helper ────────────────────────────────────────────────────────────────────
const reasonSchema = z.object({ reason: z.string().min(1) });

const createDriverSchema = z.object({
  name:           z.string().min(2).max(80),
  phone:          z.string().regex(/^[6-9]\d{9}$/, 'Invalid 10-digit mobile number'),
  vehicle_type:   z.enum(['auto', 'cab', 'mini']).optional().default('auto'),
  vehicle_reg_no: z.string().min(4).max(20).optional(),
  vehicle_model:  z.string().max(50).optional(),
  note:           z.string().max(500).optional(), // ops notes
});

// ────────────────────────────────────────────────────────────────────────────
// DRIVER MANAGEMENT
// ────────────────────────────────────────────────────────────────────────────

/**
 * POST /admin/drivers
 * Hand-held (phone-assisted) driver signup by ops team.
 * Creates a driver record with kyc_status = 'manual_review'.
 * Sends a one-time PIN via SMS for driver to set their own password.
 */
router.post('/drivers', async (req, res, next) => {
  try {
    const parsed = createDriverSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    }

    const { name, phone, vehicle_type, vehicle_reg_no, vehicle_model, note } = parsed.data;

    // 1. Check no existing driver with this phone
    const { data: existing } = await supabase
      .from('drivers')
      .select('id')
      .eq('phone', phone)
      .limit(1);

    if (existing?.length) {
      return res.status(409).json({ error: 'A driver with this phone number already exists.' });
    }

    // 2. Generate a 6-digit temporary PIN
    const tempPin = crypto.randomInt(100000, 999999).toString();
    // In production, hash the PIN. Stored temporarily so the driver can log in and set a real password.
    // Here we persist it as a plain-text claim in a dedicated column or in metadata.
    // For Supabase: create an auth user and a driver row.

    // 3. Insert the driver row (pre-registered, pending self-activation)
    const { data: driverRow, error: insertErr } = await supabase
      .from('drivers')
      .insert({
        name,
        phone,
        vehicle_type,
        vehicle_reg_no: vehicle_reg_no || null,
        vehicle_model:  vehicle_model  || null,
        kyc_status:          'manual_review',
        verification_status: 'pending',
        is_active:           false,
        gender_verified:     false,
        onboarding_method:   'admin_assisted',
        onboarding_note:     note || null,
        onboarding_admin_id: req.user?.id || null,
        temp_pin:            tempPin, // driver uses this to complete signup
      })
      .select('id, name, phone')
      .single();

    if (insertErr) {
      logger.error('POST /admin/drivers — insert failed', { error: insertErr.message });
      return next(insertErr);
    }

    // 4. Send SMS with temporary PIN
    const smsMsg = `Welcome to Sakhi! Your temporary login PIN is ${tempPin}. Open the Sakhi Driver app and enter this PIN to complete your registration. It expires in 48 hours.`;
    await smsService.sendSMS(phone, smsMsg).catch((e) =>
      logger.warn('POST /admin/drivers — SMS send failed', { phone, error: e.message })
    );

    logger.info('POST /admin/drivers — driver pre-registered', { driverId: driverRow.id, phone, createdBy: req.user?.id });

    return res.status(201).json({
      message: 'Driver pre-registered successfully. A temporary PIN has been sent via SMS.',
      driver: {
        id:    driverRow.id,
        name:  driverRow.name,
        phone: driverRow.phone,
      },
      temp_pin: tempPin, // also return to ops agent for verbal confirmation
    });
  } catch (err) { return next(err); }
});


/**
 * PATCH /admin/drivers/:id/approve
 */
router.patch('/drivers/:id/approve', async (req, res, next) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('drivers')
      .update({ kyc_status: 'verified', verification_status: 'approved', is_active: true })
      .eq('id', id);

    if (error) return next(error);

    await fcmService.sendToUser(id, 'driver', {
      title: 'Account Approved ✅',
      body: 'Congratulations! Your account has been approved. You can now start accepting rides.',
      data: { type: 'KYC_APPROVED' },
    });

    logger.info('admin — driver approved', { driverId: id, adminId: req.user.userId });
    return res.status(200).json({ success: true, driver_id: id, kyc_status: 'verified' });
  } catch (err) {
    return next(err);
  }
});

/**
 * PATCH /admin/drivers/:id/reject
 */
router.patch('/drivers/:id/reject', async (req, res, next) => {
  try {
    const { reason } = reasonSchema.parse(req.body);
    const { id } = req.params;

    const { error } = await supabase
      .from('drivers')
      .update({ kyc_status: 'rejected', verification_status: 'rejected' })
      .eq('id', id);

    if (error) return next(error);

    await fcmService.sendToUser(id, 'driver', {
      title: 'Account Rejected',
      body: `Your KYC was rejected. Reason: ${reason}. Please re-upload your documents.`,
      data: { type: 'KYC_REJECTED' },
    });

    logger.info('admin — driver rejected', { driverId: id, reason, adminId: req.user.userId });
    return res.status(200).json({ success: true, driver_id: id, kyc_status: 'rejected' });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: 'reason is required', details: err.flatten() } });
    }
    return next(err);
  }
});

// ────────────────────────────────────────────────────────────────────────────
// USER (RIDER) MANAGEMENT
// ────────────────────────────────────────────────────────────────────────────

/**
 * PATCH /admin/users/:id/verify
 */
router.patch('/users/:id/verify', async (req, res, next) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('users')
      .update({ gender_verified: true, verification_status: 'approved' })
      .eq('id', id);

    if (error) return next(error);

    await fcmService.sendToUser(id, 'rider', {
      title: 'Verification Approved ✅',
      body: 'Your identity has been verified. You can now book rides!',
      data: { type: 'GENDER_VERIFIED' },
    });

    logger.info('admin — user verified', { userId: id, adminId: req.user.userId });
    return res.status(200).json({ success: true, user_id: id, verification_status: 'approved' });
  } catch (err) {
    return next(err);
  }
});

/**
 * PATCH /admin/users/:id/reject
 */
router.patch('/users/:id/reject', async (req, res, next) => {
  try {
    const { reason } = reasonSchema.parse(req.body);
    const { id } = req.params;

    const { error } = await supabase
      .from('users')
      .update({ verification_status: 'rejected' })
      .eq('id', id);

    if (error) return next(error);

    await fcmService.sendToUser(id, 'rider', {
      title: 'Verification Rejected',
      body: `Your verification was rejected. Reason: ${reason}. Please try again.`,
      data: { type: 'GENDER_REJECTED' },
    });

    logger.info('admin — user rejected', { userId: id, reason, adminId: req.user.userId });
    return res.status(200).json({ success: true, user_id: id, verification_status: 'rejected' });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: 'reason is required', details: err.flatten() } });
    }
    return next(err);
  }
});

// ────────────────────────────────────────────────────────────────────────────
// NOTIFICATIONS — BROADCAST
// ────────────────────────────────────────────────────────────────────────────

const broadcastSchema = z.object({
  target: z.enum(['all_riders', 'all_drivers', 'all']),
  title:  z.string().min(1).max(200),
  body:   z.string().min(1).max(500),
  data:   z.record(z.string()).optional(),
});

/**
 * POST /admin/notifications/broadcast
 * Body: { target: 'all_riders'|'all_drivers'|'all', title, body, data? }
 */
router.post('/notifications/broadcast', async (req, res, next) => {
  try {
    const { target, title, body, data } = broadcastSchema.parse(req.body);

    const result = await fcmService.sendAdminBroadcast(target, { title, body, data: data || {} });

    logger.info('admin — broadcast notification sent', { target, adminId: req.user.userId, ...result });
    return res.status(200).json({ success: true, target, ...result });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid broadcast payload', details: err.flatten() } });
    }
    return next(err);
  }
});

// ── GAP 7: Listing endpoints for admin dashboard ────────────────────────────

/**
 * GET /admin/drivers
 * Query params: page, limit, status (online|offline), verification_status, search
 */
router.get('/drivers', async (req, res, next) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page  || '1', 10));
    const limit  = Math.min(100, Math.max(1, parseInt(req.query.limit || '20', 10)));
    const from   = (page - 1) * limit;

    let query = supabase
      .from('drivers')
      .select(
        'id, name, phone, email, vehicle_type, vehicle_reg_no, kyc_status, verification_status, is_active, is_online, avg_rating, total_rides, created_at',
        { count: 'exact' }
      );

    if (req.query.verification_status) query = query.eq('verification_status', req.query.verification_status);
    if (req.query.status === 'online')  query = query.eq('is_online', true);
    if (req.query.status === 'offline') query = query.eq('is_online', false);
    if (req.query.search) {
      query = query.or(`name.ilike.%${req.query.search}%,phone.ilike.%${req.query.search}%,vehicle_reg_no.ilike.%${req.query.search}%`);
    }

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(from, from + limit - 1);

    if (error) return next(error);

    return res.status(200).json({
      drivers:     data || [],
      total:       count || 0,
      page,
      limit,
      total_pages: Math.ceil((count || 0) / limit) || 1,
    });
  } catch (err) { return next(err); }
});

/**
 * GET /admin/users
 * Query params: page, limit, verification_status, search
 */
router.get('/users', async (req, res, next) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page  || '1', 10));
    const limit  = Math.min(100, Math.max(1, parseInt(req.query.limit || '20', 10)));
    const from   = (page - 1) * limit;

    let query = supabase
      .from('users')
      .select(
        'id, name, phone, gender, gender_verified, verification_status, is_active, created_at, referral_code',
        { count: 'exact' }
      );

    if (req.query.verification_status) query = query.eq('verification_status', req.query.verification_status);
    if (req.query.search) {
      query = query.or(`name.ilike.%${req.query.search}%,phone.ilike.%${req.query.search}%`);
    }

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(from, from + limit - 1);

    if (error) return next(error);

    return res.status(200).json({
      users:       data || [],
      total:       count || 0,
      page,
      limit,
      total_pages: Math.ceil((count || 0) / limit) || 1,
    });
  } catch (err) { return next(err); }
});

module.exports = router;
