'use strict';

const { z } = require('zod');
const subscriptionService = require('../services/subscriptionService');
const AppError = require('../utils/AppError');
const supabase = require('../config/supabase');

// ── Zod schema ────────────────────────────────────────────────────────────────
const createSubSchema = z.object({
  pickup_lat:          z.number().min(-90).max(90),
  pickup_lng:          z.number().min(-180).max(180),
  pickup_address:      z.string().optional(),
  drop_lat:            z.number().min(-90).max(90),
  drop_lng:            z.number().min(-180).max(180),
  drop_address:        z.string().optional(),
  pickup_time:         z.string().regex(/^\d{2}:\d{2}$/, 'Must be HH:MM'),
  return_pickup_time:  z.string().regex(/^\d{2}:\d{2}$/).optional(),
  start_date:          z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  plan_rides:          z.number().int().refine((v) => [7, 14, 21, 30].includes(v), { message: 'plan_rides must be 7, 14, 21, or 30' }),
  days_of_week:        z.array(z.number().int().min(0).max(6)).min(1),
  is_two_way:          z.boolean().default(false),
  payment_id:          z.string().min(1),
});

function handleError(err, res, next) {
  if (err.name === 'ZodError') {
    return res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid input.', details: err.flatten() } });
  }
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: { code: err.code, message: err.message, details: err.details } });
  }
  return next(err);
}

// ── GET /subscriptions ────────────────────────────────────────────────────────
async function listSubscriptions(req, res, next) {
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*, drivers(id, name, phone, vehicle_model, vehicle_reg_no, profile_photo_url)')
      .eq('rider_id', req.user.userId)
      .order('created_at', { ascending: false });

    if (error) throw new AppError('Failed to fetch subscriptions.', 500, 'DB_ERROR');
    return res.status(200).json({ subscriptions: data || [] });
  } catch (err) { return handleError(err, res, next); }
}

// ── GET /subscriptions/:id ────────────────────────────────────────────────────
async function getSubscription(req, res, next) {
  try {
    const { data: rows } = await supabase
      .from('subscriptions')
      .select('*, drivers(id, name, phone, vehicle_model, vehicle_reg_no, profile_photo_url), subscription_rides(*)')
      .eq('id', req.params.id)
      .eq('rider_id', req.user.userId)
      .limit(1);

    if (!rows?.length) throw new AppError('Subscription not found.', 404, 'NOT_FOUND');
    return res.status(200).json(rows[0]);
  } catch (err) { return handleError(err, res, next); }
}

// ── PATCH /subscriptions/:id/pause ───────────────────────────────────────────
async function pauseSubscription(req, res, next) {
  try {
    const result = await subscriptionService.pauseSubscription(req.user.userId, req.params.id);
    return res.status(200).json(result);
  } catch (err) { return handleError(err, res, next); }
}

// ── PATCH /subscriptions/:id/resume ──────────────────────────────────────────
async function resumeSubscription(req, res, next) {
  try {
    const result = await subscriptionService.resumeSubscription(req.user.userId, req.params.id);
    return res.status(200).json(result);
  } catch (err) { return handleError(err, res, next); }
}

// ── PATCH /subscriptions/:id/cancel ──────────────────────────────────────────
async function cancelSubscription(req, res, next) {
  try {
    const result = await subscriptionService.cancelSubscription(req.user.userId, req.params.id);
    return res.status(200).json(result);
  } catch (err) { return handleError(err, res, next); }
}

// ── GET /subscriptions/:id/status ────────────────────────────────────────────
async function getSubscriptionStatus(req, res, next) {
  try {
    const { data: rows } = await supabase
      .from('subscriptions')
      .select('status, rides_remaining, end_date')
      .eq('id', req.params.id)
      .eq('rider_id', req.user.userId)
      .limit(1);

    if (!rows?.length) throw new AppError('Subscription not found.', 404, 'NOT_FOUND');

    const sub = rows[0];

    // Next scheduled ride date
    const { data: nextRide } = await supabase
      .from('subscription_rides')
      .select('scheduled_date, scheduled_time')
      .eq('subscription_id', req.params.id)
      .eq('status', 'scheduled')
      .gte('scheduled_date', new Date().toISOString().slice(0, 10))
      .order('scheduled_date', { ascending: true })
      .limit(1);

    return res.status(200).json({
      status:               sub.status,
      rides_remaining:      sub.rides_remaining,
      end_date:             sub.end_date,
      next_scheduled_date:  nextRide?.[0]?.scheduled_date || null,
      next_scheduled_time:  nextRide?.[0]?.scheduled_time || null,
    });
  } catch (err) { return handleError(err, res, next); }
}

// ── GET /subscriptions/pending-payment (ITEM 13) ─────────────────────────────
// Returns subscriptions in 'pending_payment' status for the current rider.
// Used when payment verification fails — rider can retry from this data.
async function getPendingPayment(req, res, next) {
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('id, pickup_address, drop_address, pickup_time, start_date, plan_rides, total_cost, created_at')
      .eq('rider_id', req.user.userId)
      .eq('status', 'pending_payment')
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) throw new AppError('Failed to fetch pending subscriptions.', 500, 'DB_ERROR');
    return res.status(200).json({ pending: data || [] });
  } catch (err) { return handleError(err, res, next); }
}

module.exports = {
  listSubscriptions,
  getSubscription,
  pauseSubscription,
  resumeSubscription,
  cancelSubscription,
  getSubscriptionStatus,
  getPendingPayment,
};
