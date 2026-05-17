'use strict';

const { z } = require('zod');
const supabase = require('../config/supabase');
const AppError = require('../utils/AppError');
const { isMessagingReady } = require('../services/fcmService');

function handleError(err, res, next) {
  if (err.name === 'ZodError') return res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid input.', details: err.flatten() } });
  if (err instanceof AppError) return res.status(err.statusCode).json({ error: { code: err.code, message: err.message, details: err.details } });
  return next(err);
}

// ── PATCH /users/fcm-token (rider) ────────────────────────────────────────────
const fcmTokenSchema = z.object({ fcm_token: z.string().min(10) });

async function updateRiderFcmToken(req, res, next) {
  try {
    const { fcm_token } = fcmTokenSchema.parse(req.body);
    const { error } = await supabase.from('users').update({ fcm_token }).eq('id', req.user.userId);
    if (error) throw new AppError('Failed to update FCM token.', 500, 'DB_ERROR');
    return res.status(200).json({ success: true });
  } catch (err) { return handleError(err, res, next); }
}

// ── PATCH /drivers/fcm-token (driver) ────────────────────────────────────────
async function updateDriverFcmToken(req, res, next) {
  try {
    const { fcm_token } = fcmTokenSchema.parse(req.body);
    const { error } = await supabase.from('drivers').update({ fcm_token }).eq('id', req.user.userId);
    if (error) throw new AppError('Failed to update FCM token.', 500, 'DB_ERROR');
    return res.status(200).json({ success: true });
  } catch (err) { return handleError(err, res, next); }
}

// ── GET /notifications ────────────────────────────────────────────────────────
async function getNotifications(req, res, next) {
  try {
    const userId = req.user.userId;
    const { data, error } = await supabase
      .from('notifications_log')
      .select('id, type, title, body, read, sent_at')
      .eq('user_id', userId)
      .order('sent_at', { ascending: false })
      .limit(50);

    if (error) throw new AppError('Failed to fetch notifications.', 500, 'DB_ERROR');
    return res.status(200).json({ notifications: data || [] });
  } catch (err) { return handleError(err, res, next); }
}

// ── POST /notifications/:id/read ──────────────────────────────────────────────
async function markRead(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const { data } = await supabase
      .from('notifications_log')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .limit(1);

    if (!data?.length) throw new AppError('Notification not found.', 404, 'NOT_FOUND');

    await supabase.from('notifications_log').update({ read: true }).eq('id', id);
    return res.status(200).json({ success: true });
  } catch (err) { return handleError(err, res, next); }
}

// ── POST /notifications/read-all ──────────────────────────────────────────────
async function markAllRead(req, res, next) {
  try {
    const userId = req.user.userId;
    await supabase
      .from('notifications_log')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);
    return res.status(200).json({ success: true });
  } catch (err) { return handleError(err, res, next); }
}

// ── GET /notifications/driver-health ───────────────────────────────────────
async function getDriverFcmHealth(req, res, next) {
  try {
    const userId = req.user.userId;
    const { data: driverRows, error: driverError } = await supabase
      .from('drivers')
      .select('fcm_token')
      .eq('id', userId)
      .limit(1);

    if (driverError) throw new AppError('Failed to fetch driver token.', 500, 'DB_ERROR');

    const hasToken = Boolean(driverRows?.[0]?.fcm_token);

    const { data: notifRows } = await supabase
      .from('notifications_log')
      .select('id, type, sent_at')
      .eq('user_id', userId)
      .order('sent_at', { ascending: false })
      .limit(1);

    return res.status(200).json({
      firebase_ready: isMessagingReady(),
      has_fcm_token: hasToken,
      last_notification: notifRows?.[0] ?? null,
    });
  } catch (err) {
    return handleError(err, res, next);
  }
}

module.exports = {
  updateRiderFcmToken,
  updateDriverFcmToken,
  getNotifications,
  markRead,
  markAllRead,
  getDriverFcmHealth,
};
