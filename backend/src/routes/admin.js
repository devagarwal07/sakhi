'use strict';

const { Router } = require('express');
const { z } = require('zod');
const authMiddleware = require('../middleware/authMiddleware');
const roleGuard = require('../middleware/roleGuard');
const supabase = require('../config/supabase');
const fcmService = require('../services/fcmService');
const logger = require('../utils/logger');

const router = Router();

// All admin routes require auth + admin role
router.use(authMiddleware, roleGuard('admin'));

// ── Helper ────────────────────────────────────────────────────────────────────
const reasonSchema = z.object({ reason: z.string().min(1) });

// ────────────────────────────────────────────────────────────────────────────
// DRIVER MANAGEMENT
// ────────────────────────────────────────────────────────────────────────────

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

module.exports = router;
