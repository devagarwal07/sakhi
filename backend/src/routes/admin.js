'use strict';

const { Router } = require('express');
const { z } = require('zod');
const crypto = require('crypto');
const authMiddleware = require('../middleware/authMiddleware');
const roleGuard = require('../middleware/roleGuard');
const supabase = require('../config/supabase');
const fcmService = require('../services/fcmService');
const smsService = require('../services/smsService');
const logger = require('../utils/logger');
const { adminLimiter } = require('../middleware/rateLimiter');

const router = Router();

// All admin routes: rate limit + auth + admin role
router.use(adminLimiter, authMiddleware, roleGuard('admin'));

// ── Helper ────────────────────────────────────────────────────────────────────
const reasonSchema = z.object({ reason: z.string().min(1) });

const createDriverSchema = z.object({
  name: z.string().min(2).max(80),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Invalid 10-digit mobile number'),
  vehicle_type: z.enum(['auto', 'cab', 'mini']).optional().default('auto'),
  vehicle_reg_no: z.string().min(4).max(20).optional(),
  vehicle_model: z.string().max(50).optional(),
  note: z.string().max(500).optional(), // ops notes
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
        vehicle_model: vehicle_model || null,
        kyc_status: 'manual_review',
        verification_status: 'pending',
        is_active: false,
        gender_verified: false,
        onboarding_method: 'admin_assisted',
        onboarding_note: note || null,
        onboarding_admin_id: req.user?.id || null,
        temp_pin: tempPin, // driver uses this to complete signup
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
        id: driverRow.id,
        name: driverRow.name,
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

/**
 * POST /admin/drivers/:id/verify-dl
 * Body: { dl_number?, dob?, full_name? }  — all optional (fall back to DB values)
 *
 * Admin can manually re-trigger DL verification via Surepass for any driver.
 *
 * Returns:
 *   { driver_id, dl_number, verified, dl_status, name, doe, doi,
 *     vehicle_classes, gender, state, ola_name, persisted }
 */
router.post('/drivers/:id/verify-dl', async (req, res, next) => {
  try {
    const surepassService = require('../services/surepassService');
    const { id } = req.params;

    // Fetch stored driver fields
    const { data: rows, error: fetchErr } = await supabase
      .from('drivers')
      .select('dl_number, dl_number_from_digilocker, dob, aadhaar_dob, name')
      .eq('id', id)
      .limit(1);
    if (fetchErr) return next(fetchErr);
    const driver = rows?.[0];
    if (!driver) return res.status(404).json({ error: { code: 'DRIVER_NOT_FOUND', message: 'Driver not found.', details: {} } });

    const dlNumber = req.body?.dl_number || driver.dl_number || driver.dl_number_from_digilocker;
    const dob = req.body?.dob || driver.dob || driver.aadhaar_dob;
    const fullName = req.body?.full_name || driver.name;

    if (!dlNumber) return res.status(422).json({ error: { code: 'MISSING_DL_NUMBER', message: 'No DL number on record for this driver.', details: {} } });

    const payload = await surepassService.verifyDL(dlNumber, { fullName, dob });
    const persisted = await surepassService.persistDLVerification(id, payload);

    const d = payload?.data || {};
    const verified = payload?.success === true;
    const dlStatus = verified ? (d.doe && new Date(d.doe) < new Date() ? 'expired' : 'verified') : 'rejected';

    // Notify driver (non-fatal)
    await fcmService.sendToUser(id, 'driver', {
      title: verified ? 'Driving Licence Verified ✅' : 'DL Verification Failed',
      body: verified
        ? 'Your Driving Licence has been verified successfully.'
        : 'DL verification failed. Please ensure your licence number is correct.',
      data: { type: 'DL_VERIFICATION_RESULT', verified: String(verified) },
    }).catch(() => { });

    logger.info('admin — DL verification triggered (Surepass)', {
      driverId: id, dlNumber, verified, adminId: req.user.userId,
    });

    return res.status(200).json({
      driver_id: id,
      dl_number: d.license_number || dlNumber,
      verified,
      dl_status: dlStatus,
      name: d.name || null,
      doe: d.doe || null,
      doi: d.doi || null,
      vehicle_classes: d.vehicle_classes || [],
      gender: d.gender || null,
      state: d.state || null,
      ola_name: d.ola_name || null,
      persisted,
    });
  } catch (err) {
    if (err.response?.data) {
      const status = err.response.status || 502;
      return res.status(status).json({ error: { code: 'SUREPASS_ERROR', message: 'Surepass DL API error', details: err.response.data } });
    }
    if (err.code && err.status) return res.status(err.status).json({ error: { code: err.code, message: err.message, details: {} } });
    return next(err);
  }
});


/**
 * POST /admin/drivers/:id/verify-rc
 * Body: { rc_number?, enrich? }  — all optional (fall back to DB values)
 *
 * Admin can manually trigger or re-trigger RC verification for any driver.
 * Pass enrich: true to get owner name + chassis number unmasked in the response.
 *
 * Returns:
 *   { driver_id, rc_number, verified, rc_status, maker_model, fuel_type,
 *     insurance_upto, fit_upto, blacklist_status, response_metadata, persisted }
 */
router.post('/drivers/:id/verify-rc', async (req, res, next) => {
  try {
    const rcService = require('../services/rcService');
    const { id } = req.params;

    // Fetch stored vehicle_reg_no as fallback
    const { data: rows, error: fetchErr } = await supabase
      .from('drivers')
      .select('vehicle_reg_no, name')
      .eq('id', id)
      .limit(1);
    if (fetchErr) return next(fetchErr);
    const driver = rows?.[0];
    if (!driver) {
      return res.status(404).json({ error: { code: 'DRIVER_NOT_FOUND', message: 'Driver not found.', details: {} } });
    }

    const rcNumber = req.body?.rc_number || driver.vehicle_reg_no;
    const enrich = !!req.body?.enrich;

    if (!rcNumber) {
      return res.status(422).json({
        error: { code: 'MISSING_RC_NUMBER', message: 'No vehicle registration number on record for this driver.', details: {} },
      });
    }

    const payload = await rcService.verifyRC(rcNumber, enrich);
    const persisted = await rcService.persistRCVerification(id, payload);

    const d = payload?.data || {};
    const verified = payload?.success === true;
    const rcStatus = verified ? (d.blacklist_status ? 'blacklisted' : 'verified') : 'rejected';

    // Notify driver of result (non-fatal)
    await fcmService.sendToUser(id, 'driver', {
      title: verified ? 'RC Verified ✅' : 'RC Verification Failed',
      body: verified
        ? 'Your vehicle Registration Certificate has been verified successfully.'
        : 'RC verification failed. Please ensure your vehicle registration number is correct.',
      data: { type: 'RC_VERIFICATION_RESULT', verified: String(verified) },
    }).catch(() => { });

    logger.info('admin — RC verification triggered', {
      driverId: id, rcNumber, verified, enrich, adminId: req.user.userId,
    });

    return res.status(200).json({
      driver_id: id,
      rc_number: d.rc_number || rcNumber,
      verified,
      rc_status: rcStatus,
      maker_model: d.maker_model || null,
      fuel_type: d.fuel_type || null,
      insurance_upto: d.insurance_upto || null,
      fit_upto: d.fit_up_to || null,
      blacklist_status: d.blacklist_status || '',
      response_metadata: d.response_metadata || {},
      persisted,
    });
  } catch (err) {
    if (err.response?.data) {
      const status = err.response.status || 502;
      return res.status(status).json({ error: { code: 'SUREPASS_ERROR', message: 'Surepass RC API error', details: err.response.data } });
    }
    if (err.code && err.status) return res.status(err.status).json({ error: { code: err.code, message: err.message, details: {} } });
    return next(err);
  }
});

// ────────────────────────────────────────────────────────────────────────────
// USER (RIDER) MANAGEMENT
// ────────────────────────────────────────────────────────────────────────────

/**
 * PATCH /admin/users/:id/face-reset
 * Resets face-liveness onboarding state so the rider can retry capture.
 * Clears attempts + manual review flag + clears the last session/result fields.
 */
router.patch('/users/:id/face-reset', async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('users')
      .update({
        face_review_required: false,
        face_verification_attempts: 0,
        face_liveness_session_id: null,
        face_liveness_confidence: null,
        face_gender: null,
        face_gender_confidence: null,
        face_reference_photo_url: null,
        face_decision_reason: null,
        face_reviewed_by: null,
        face_reviewed_at: null,
        verification_status: 'pending',
        verification_method: 'face_liveness',
        gender_verified: false,
      })
      .eq('id', id)
      .select('id, name, phone, verification_status, verification_method, face_review_required, face_verification_attempts')
      .single();

    if (error) return next(error);

    logger.info('admin — user face verification reset', { userId: id, adminId: req.user.userId });
    return res.status(200).json({ success: true, user: data });
  } catch (err) {
    return next(err);
  }
});

/**
 * PATCH /admin/users/:id/verify
 */
router.patch('/users/:id/verify', async (req, res, next) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('users')
      .update({
        gender_verified: true,
        verification_status: 'approved',
        face_review_required: false,
        face_reviewed_by: req.user.userId,
        face_reviewed_at: new Date().toISOString(),
        face_decision_reason: 'manual_approved',
      })
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
      .update({
        verification_status: 'rejected',
        face_review_required: false,
        face_reviewed_by: req.user.userId,
        face_reviewed_at: new Date().toISOString(),
        face_decision_reason: `manual_rejected:${reason}`,
      })
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

/**
 * GET /admin/users/face-review
 * Lists riders who have exhausted retries and require manual review.
 * Query params: page, limit, search
 */
router.get('/users/face-review', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '20', 10)));
    const from = (page - 1) * limit;

    let query = supabase
      .from('users')
      .select(
        'id, name, phone, verification_status, verification_method, face_review_required, face_reference_photo_url, face_liveness_confidence, face_gender, face_gender_confidence, face_verification_attempts, created_at',
        { count: 'exact' }
      )
      .eq('face_review_required', true)
      .order('created_at', { ascending: false });

    if (req.query.search) {
      query = query.or(`name.ilike.%${req.query.search}%,phone.ilike.%${req.query.search}%`);
    }

    const { data, count, error } = await query.range(from, from + limit - 1);
    if (error) return next(error);

    return res.status(200).json({
      users: data || [],
      total: count || 0,
      page,
      limit,
      total_pages: Math.ceil((count || 0) / limit) || 1,
    });
  } catch (err) {
    return next(err);
  }
});

// ────────────────────────────────────────────────────────────────────────────
// NOTIFICATIONS — BROADCAST
// ────────────────────────────────────────────────────────────────────────────

const broadcastSchema = z.object({
  target: z.enum(['all_riders', 'all_drivers', 'all']),
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(500),
  data: z.record(z.string()).optional(),
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
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '20', 10)));
    const from = (page - 1) * limit;

    let query = supabase
      .from('drivers')
      .select(
        'id, name, phone, email, vehicle_type, vehicle_reg_no, kyc_status, aadhaar_status, digilocker_consent_at, verification_status, is_active, is_online, avg_rating, total_rides, created_at, rc_status, rc_verified_at',
        { count: 'exact' }
      );

    if (req.query.verification_status) query = query.eq('verification_status', req.query.verification_status);
    if (req.query.status === 'online') query = query.eq('is_online', true);
    if (req.query.status === 'offline') query = query.eq('is_online', false);
    if (req.query.search) {
      query = query.or(`name.ilike.%${req.query.search}%,phone.ilike.%${req.query.search}%,vehicle_reg_no.ilike.%${req.query.search}%`);
    }

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(from, from + limit - 1);

    if (error) return next(error);

    return res.status(200).json({
      drivers: data || [],
      total: count || 0,
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
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '20', 10)));
    const from = (page - 1) * limit;

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
      users: data || [],
      total: count || 0,
      page,
      limit,
      total_pages: Math.ceil((count || 0) / limit) || 1,
    });
  } catch (err) { return next(err); }
});

// ────────────────────────────────────────────────────────────────────────────
// GAMIFICATION — WEEKLY LEADERBOARD
// ────────────────────────────────────────────────────────────────────────────

/**
 * GET /admin/leaderboard/weekly?week=2026-W13
 * Returns the weekly leaderboard snapshot.
 * Defaults to the current ISO week if no `week` query param.
 */
router.get('/leaderboard/weekly', async (req, res, next) => {
  try {
    const { getWeekLabel } = require('../workers/LeaderboardWorker');
    const week = req.query.week || getWeekLabel();

    const { data: rows, error } = await supabase
      .from('weekly_leaderboard')
      .select(`
        rank, composite_score, rides_count, avg_rating_snap,
        acceptance_rate_snap, payout_amount, payout_done, week_label,
        drivers!inner(id, name, phone, vehicle_type, avg_rating, loyalty_tier)
      `)
      .eq('week_label', week)
      .order('rank', { ascending: true });

    if (error) return next(error);

    return res.status(200).json({ week_label: week, leaderboard: rows || [] });
  } catch (err) { return next(err); }
});

/**
 * POST /admin/leaderboard/weekly/recompute
 * Manually trigger a leaderboard computation for any past week.
 * Body: { week: '2026-W12' }
 */
router.post('/leaderboard/weekly/recompute', async (req, res, next) => {
  try {
    const { buildLeaderboard, getWeekLabel } = require('../workers/LeaderboardWorker');
    const week = req.body?.week || getWeekLabel();

    // Non-blocking — kick off async
    buildLeaderboard(week).catch((e) =>
      logger.error('POST /admin/leaderboard/recompute — error', { error: e.message })
    );

    return res.status(202).json({ message: `Leaderboard recomputation started for ${week}` });
  } catch (err) { return next(err); }
});

// ────────────────────────────────────────────────────────────────────────────
// DEBUG — SMS SMOKE TEST
// ────────────────────────────────────────────────────────────────────────────

const testSmsSchema = z.object({
  phone: z
    .string()
    .regex(/^\+?[6-9]\d{9}$/, 'Must be a valid 10-digit Indian mobile (with or without +91 prefix)')
    .transform((p) => (p.startsWith('+') ? p : `+91${p}`)),
  type: z.enum(['otp', 'sms', 'bulk']).default('otp'),
  // optional: custom message for type=sms/bulk
  message: z.string().max(320).optional(),
});

/**
 * POST /admin/debug/test-sms
 *
 * Fires a real MSG91 SMS for smoke-testing the SMS integration.
 * Safe to share with MSG91 support as a "demo API" — protected by admin auth.
 *
 * Body:
 *   { "phone": "9876543210", "type": "otp" | "sms" | "bulk", "message": "..." }
 *
 * type = "otp"   → triggers otpService.sendOTP  (uses MSG91 OTP template)
 * type = "sms"   → triggers smsService.sendSMS  (uses MSG91 Flow template)
 * type = "bulk"  → triggers smsService.sendBulkSMS with [phone] as the list
 *
 * Response includes:
 *   - provider: "msg91"
 *   - type used
 *   - phone called
 *   - raw MSG91 API response
 *   - credentials_configured flag (won't expose actual key values)
 *   - timestamp
 */
router.post('/debug/test-sms', async (req, res, next) => {
  try {
    const parsed = testSmsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: parsed.error.flatten(),
      });
    }

    const { phone, type, message } = parsed.data;

    // Credentials health check — return useful diagnostics without leaking values
    const credentialsConfigured = !!(
      process.env.MSG91_AUTH_KEY && process.env.MSG91_TEMPLATE_ID
    );
    const authKeyHint = process.env.MSG91_AUTH_KEY
      ? `${process.env.MSG91_AUTH_KEY.slice(0, 6)}...` // first 6 chars only
      : null;

    logger.info('admin — test-sms triggered', {
      phone,
      type,
      adminId: req.user?.userId ?? req.user?.id,
    });

    let result;
    const testMessage = message || `[Sakhi Test] SMS delivery verification. Type: ${type}. Time: ${new Date().toISOString()}`;

    if (type === 'otp') {
      // Uses otpService — stores OTP in Redis/Supabase AND fires MSG91 OTP API
      const { sendOTP } = require('../services/otpService');
      await sendOTP(phone);
      result = { dispatched: true, note: 'OTP generated, stored, and sent via MSG91 OTP API. Check the phone for the 6-digit code.' };

    } else if (type === 'sms') {
      result = await require('../services/smsService').sendSMS(phone, testMessage);

    } else if (type === 'bulk') {
      // Single-number bulk — same code path as real bulk but with one recipient
      result = await require('../services/smsService').sendBulkSMS([phone], testMessage);
    }

    logger.info('admin — test-sms completed', { phone, type, result });

    return res.status(200).json({
      success: true,
      provider: 'msg91',
      type,
      phone,
      message_sent: type === 'otp' ? '(OTP — generated internally)' : testMessage,
      credentials_configured: credentialsConfigured,
      auth_key_hint: authKeyHint,
      template_id: process.env.MSG91_TEMPLATE_ID || null,
      msg91_response: result,
      tested_at: new Date().toISOString(),
      tested_by: req.user?.userId ?? req.user?.id ?? 'admin',
    });
  } catch (err) {
    logger.error('admin — test-sms error', { error: err.message });
    // Return structured error so MSG91 support can read it
    return res.status(500).json({
      success: false,
      provider: 'msg91',
      error_message: err.message,
      msg91_response: err.response?.data || null,
      http_status: err.response?.status || 500,
      tested_at: new Date().toISOString(),
    });
  }
});

module.exports = router;

