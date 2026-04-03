'use strict';

const { z } = require('zod');
const supabase = require('../config/supabase');
const fcmService = require('../services/fcmService');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');
const { uploadSelfie } = require('../middleware/upload');

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────
function handleError(err, res, next) {
  if (err.name === 'ZodError') {
    return res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid input.', details: err.flatten() } });
  }
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: { code: err.code, message: err.message, details: err.details } });
  }
  return next(err);
}

// ──────────────────────────────────────────────────────────────────────────────
// PATCH /drivers/status
// ──────────────────────────────────────────────────────────────────────────────
const statusSchema = z.object({
  is_online: z.boolean(),
  lat:       z.number().min(-90).max(90).optional(),
  lng:       z.number().min(-180).max(180).optional(),
});

async function updateDriverStatus(req, res, next) {
  try {
    const { is_online, lat, lng } = statusSchema.parse(req.body);
    const driverId = req.user.userId;
    const io = req.app.get('io');

    // Fetch driver record
    const { data: driverRows } = await supabase
      .from('drivers')
      .select('id, kyc_status, verification_status, is_active')
      .eq('id', driverId)
      .limit(1);

    const driver = driverRows?.[0];
    if (!driver) throw new AppError('Driver not found.', 404, 'DRIVER_NOT_FOUND');

    if (is_online) {
      // Verify account approved
      if (driver.kyc_status !== 'verified' || driver.verification_status !== 'approved' || !driver.is_active) {
        return res.status(403).json({
          error: { code: 'ACCOUNT_NOT_APPROVED', message: 'Your account is pending approval.', details: {} },
        });
      }

      await supabase.from('drivers').update({ is_online: true }).eq('id', driverId);

      // Upsert location
      if (lat && lng) {
        await supabase.from('driver_locations').upsert(
          { driver_id: driverId, lat, lng, heading: 0, updated_at: new Date().toISOString() },
          { onConflict: 'driver_id' }
        );
      }

      if (io) io.of('/rides').to('admin:monitoring').emit('driver_online', { driver_id: driverId });
      return res.status(200).json({ is_online: true });
    } else {
      // Check for active ride
      const { data: activeRides } = await supabase
        .from('rides')
        .select('id')
        .eq('driver_id', driverId)
        .in('status', ['assigned', 'driver_en_route', 'arrived', 'in_progress'])
        .limit(1);

      if (activeRides?.length) {
        return res.status(409).json({
          error: { code: 'ACTIVE_RIDE', message: 'Cannot go offline during an active ride.', details: { ride_id: activeRides[0].id } },
        });
      }

      await Promise.all([
        supabase.from('drivers').update({ is_online: false }).eq('id', driverId),
        supabase.from('driver_locations').delete().eq('driver_id', driverId),
        supabase.from('driver_blocks').delete().eq('driver_id', driverId),
      ]);

      if (io) io.of('/rides').to('admin:monitoring').emit('driver_offline', { driver_id: driverId });
      return res.status(200).json({ is_online: false });
    }
  } catch (err) { return handleError(err, res, next); }
}

// ──────────────────────────────────────────────────────────────────────────────
// GET /drivers/earnings/today
// ──────────────────────────────────────────────────────────────────────────────
async function getEarningsToday(req, res, next) {
  try {
    const driverId = req.user.userId;
    const today = new Date().toISOString().slice(0, 10);

    const { data, error } = await supabase
      .from('driver_earnings')
      .select('gross, commission, net')
      .eq('driver_id', driverId)
      .gte('created_at', `${today}T00:00:00.000Z`)
      .lte('created_at', `${today}T23:59:59.999Z`);

    if (error) throw new AppError('Failed to fetch earnings.', 500, 'DB_ERROR');

    const rows = data || [];
    const rides_completed   = rows.length;
    const gross_earnings    = +rows.reduce((s, r) => s + parseFloat(r.gross || 0), 0).toFixed(2);
    const commission_today  = +rows.reduce((s, r) => s + parseFloat(r.commission || 0), 0).toFixed(2);
    const net_earnings      = +rows.reduce((s, r) => s + parseFloat(r.net || 0), 0).toFixed(2);

    return res.status(200).json({ rides_completed, gross_earnings, commission_today, net_earnings });
  } catch (err) { return handleError(err, res, next); }
}

// ──────────────────────────────────────────────────────────────────────────────
// GET /drivers/earnings/weekly
// ──────────────────────────────────────────────────────────────────────────────
async function getEarningsWeekly(req, res, next) {
  try {
    const driverId = req.user.userId;
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('driver_earnings')
      .select('gross, commission, net, created_at')
      .eq('driver_id', driverId)
      .gte('created_at', sevenDaysAgo)
      .order('created_at', { ascending: false });

    if (error) throw new AppError('Failed to fetch earnings.', 500, 'DB_ERROR');

    // Group by date in JS
    const byDate = {};
    for (const row of data || []) {
      const date = row.created_at.slice(0, 10);
      if (!byDate[date]) byDate[date] = { date, gross: 0, commission: 0, net: 0, rides: 0 };
      byDate[date].gross      += parseFloat(row.gross || 0);
      byDate[date].commission += parseFloat(row.commission || 0);
      byDate[date].net        += parseFloat(row.net || 0);
      byDate[date].rides++;
    }

    const breakdown = Object.values(byDate)
      .map((d) => ({ ...d, gross: +d.gross.toFixed(2), commission: +d.commission.toFixed(2), net: +d.net.toFixed(2) }))
      .sort((a, b) => b.date.localeCompare(a.date));

    return res.status(200).json({ breakdown });
  } catch (err) { return handleError(err, res, next); }
}

// ──────────────────────────────────────────────────────────────────────────────
// GET /drivers/earnings/ledger
// ──────────────────────────────────────────────────────────────────────────────
async function getEarningsLedger(req, res, next) {
  try {
    const driverId = req.user.userId;
    const month = new Date().toISOString().slice(0, 7); // YYYY-MM

    const [{ data: ledger }, { data: milestone }] = await Promise.all([
      supabase.from('commission_ledger')
        .select('date, active_day, amount, type, paid')
        .eq('driver_id', driverId)
        .gte('date', `${month}-01`)
        .order('date', { ascending: true }),
      supabase.from('loyalty_milestones')
        .select('active_days, milestone_reached, reward_applied')
        .eq('driver_id', driverId)
        .eq('month', month)
        .limit(1),
    ]);

    const activeDays = (ledger || []).filter((l) => l.active_day).length;

    return res.status(200).json({
      month,
      ledger:      ledger || [],
      total_active_days: activeDays,
      loyalty:     milestone?.[0] || { active_days: activeDays, milestone_reached: false, reward_applied: false },
    });
  } catch (err) { return handleError(err, res, next); }
}

// ──────────────────────────────────────────────────────────────────────────────
// GET /drivers/rides
// ──────────────────────────────────────────────────────────────────────────────
async function getDriverRides(req, res, next) {
  try {
    const driverId = req.user.userId;
    const page  = Math.max(1, parseInt(req.query.page  || '1', 10));
    const limit = Math.min(50, parseInt(req.query.limit || '20', 10));
    const from  = (page - 1) * limit;

    const { data, error, count } = await supabase
      .from('rides')
      .select(`
        id, status, pickup_address, drop_address, final_fare, estimated_fare,
        distance_km, duration_min, completed_at, rider_rating, rider_comment,
        users!rides_rider_id_fkey(name)
      `, { count: 'exact' })
      .eq('driver_id', driverId)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .range(from, from + limit - 1);

    if (error) throw new AppError('Failed to fetch rides.', 500, 'DB_ERROR');

    return res.status(200).json({
      rides: (data || []).map((r) => ({ ...r, rider_name: r.users?.name })),
      pagination: { page, limit, total: count || 0 },
    });
  } catch (err) { return handleError(err, res, next); }
}

// ──────────────────────────────────────────────────────────────────────────────
// GET /drivers/profile
// ──────────────────────────────────────────────────────────────────────────────
async function getDriverProfile(req, res, next) {
  try {
    const driverId = req.user.userId;

    const [{ data: driverRows }, { data: today }] = await Promise.all([
      supabase.from('drivers').select('*').eq('id', driverId).limit(1),
      supabase.from('driver_earnings')
        .select('gross, net')
        .eq('driver_id', driverId)
        .gte('created_at', `${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`),
    ]);

    const driver = driverRows?.[0];
    if (!driver) throw new AppError('Driver not found.', 404, 'DRIVER_NOT_FOUND');

    const todayEarnings = (today || []).reduce(
      (a, r) => ({ gross: a.gross + parseFloat(r.gross || 0), net: a.net + parseFloat(r.net || 0) }),
      { gross: 0, net: 0 }
    );

    const month = new Date().toISOString().slice(0, 7);
    const { data: milestone } = await supabase
      .from('loyalty_milestones')
      .select('active_days, milestone_reached')
      .eq('driver_id', driverId)
      .eq('month', month)
      .limit(1);

    return res.status(200).json({
      ...driver,
      earnings_today: { gross: +todayEarnings.gross.toFixed(2), net: +todayEarnings.net.toFixed(2) },
      loyalty: milestone?.[0] || { active_days: 0, milestone_reached: false },
    });
  } catch (err) { return handleError(err, res, next); }
}

// ──────────────────────────────────────────────────────────────────────────────
// PATCH /drivers/profile
// ──────────────────────────────────────────────────────────────────────────────
const profileSchema = z.object({
  name:                 z.string().min(1).optional(),
  email:                z.string().email().optional(),
  vehicle_color:        z.string().optional(),
  vehicle_model:        z.string().optional(),
  language_pref:        z.string().optional(),
  subscription_opt_in:  z.boolean().optional(),
  accessibility_note:   z.string().optional(),
  // Blocked fields that require re-KYC
  vehicle_reg_no:       z.string().optional(),
  dl_number:            z.string().optional(),
}).strip();

const REKYC_FIELDS = ['vehicle_reg_no', 'dl_number'];

async function updateDriverProfile(req, res, next) {
  try {
    const parsed = profileSchema.parse(req.body);

    // Block re-KYC fields
    const blocked = REKYC_FIELDS.filter((f) => parsed[f] !== undefined);
    if (blocked.length) {
      return res.status(422).json({
        error: {
          code: 'REKYC_REQUIRED',
          message: `Changing ${blocked.join(', ')} requires re-KYC. Please contact support.`,
          details: { fields: blocked },
        },
      });
    }

    // Handle profile photo upload if file present
    const profilePhotoUrl = req.file?.location || undefined;
    if (profilePhotoUrl) parsed.profile_photo_url = profilePhotoUrl;

    // Remove blocked fields just in case
    for (const f of REKYC_FIELDS) delete parsed[f];

    const { data, error } = await supabase
      .from('drivers')
      .update(parsed)
      .eq('id', req.user.userId)
      .select('id, name, email, vehicle_color, vehicle_model, language_pref, subscription_opt_in, profile_photo_url')
      .single();

    if (error) throw new AppError('Failed to update profile.', 500, 'DB_ERROR');
    return res.status(200).json(data);
  } catch (err) { return handleError(err, res, next); }
}

// ──────────────────────────────────────────────────────────────────────────────
// GET /drivers/subscription  — subscription expiry for home screen countdown
// ──────────────────────────────────────────────────────────────────────────────
async function getSubscriptionStatus(req, res, next) {
  try {
    const driverId = req.user.userId;

    const { data: rows, error } = await supabase
      .from('drivers')
      .select('subscription_expiry, subscription_plan')
      .eq('id', driverId)
      .limit(1);

    if (error) throw new AppError('Failed to fetch subscription.', 500, 'DB_ERROR');

    const driver = rows?.[0];
    return res.status(200).json({
      expiry_date:       driver?.subscription_expiry  ?? null,
      subscription_plan: driver?.subscription_plan    ?? null,
    });
  } catch (err) { return handleError(err, res, next); }
}

// ──────────────────────────────────────────────────────────────────────────────
// GET /drivers/commission/status  — unpaid commission summary
// ──────────────────────────────────────────────────────────────────────────────
async function getCommissionStatus(req, res, next) {
  try {
    const driverId = req.user.userId;

    const { data: entries, error } = await supabase
      .from('commission_ledger')
      .select('date, amount, type, paid, active_day')
      .eq('driver_id', driverId)
      .eq('paid', false)
      .order('date', { ascending: false });

    if (error) throw new AppError('Failed to fetch commission status.', 500, 'DB_ERROR');

    const rows = entries || [];
    const total_due = +rows
      .reduce((sum, r) => sum + parseFloat(r.amount || 0), 0)
      .toFixed(2);

    return res.status(200).json({ total_due, entries: rows });
  } catch (err) { return handleError(err, res, next); }
}

// ──────────────────────────────────────────────────────────────────────────────
// POST /drivers/location  — REST fallback for background location task
// (primary channel is socket driver:location_update)
// ──────────────────────────────────────────────────────────────────────────────
const locationSchema = z.object({
  latitude:  z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  heading:   z.number().optional(),
  speed:     z.number().optional(),
  accuracy:  z.number().optional(),
});

async function updateLocation(req, res, next) {
  try {
    const { latitude, longitude, heading, speed } = locationSchema.parse(req.body);
    const driverId = req.user.userId;

    await supabase
      .from('driver_locations')
      .upsert(
        {
          driver_id:  driverId,
          lat:        latitude,
          lng:        longitude,
          heading:    heading ?? 0,
          speed:      speed   ?? 0,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'driver_id' }
      );

    return res.status(200).json({ ok: true });
  } catch (err) { return handleError(err, res, next); }
}

// ──────────────────────────────────────────────────────────────────────────────
// GET /drivers/rides  — paginated ride history with period filtering
// ──────────────────────────────────────────────────────────────────────────────
async function getDriverRides(req, res, next) {
  try {
    const driverId = req.user.userId;
    const { period = 'all', page = '1', limit = '20', q, start_date, end_date } = req.query;

    const pg  = Math.max(1, parseInt(page,  10));
    const lim = Math.min(50, parseInt(limit, 10));
    const offset = (pg - 1) * lim;

    let query = supabase
      .from('rides')
      .select('id, status, ride_type, pickup_address, drop_address, total_fare, fare_breakdown, payment_method, payment_status, distance_km, duration_min, started_at, completed_at, created_at, rider_id')
      .eq('driver_id', driverId)
      .order('created_at', { ascending: false })
      .range(offset, offset + lim - 1);

    // ── Period filter ──────────────────────────────────────────────────────
    const now = new Date();
    if (period === 'today') {
      const start = new Date(now); start.setHours(0, 0, 0, 0);
      query = query.gte('created_at', start.toISOString());
    } else if (period === 'this_week') {
      const start = new Date(now); start.setDate(now.getDate() - now.getDay()); start.setHours(0, 0, 0, 0);
      query = query.gte('created_at', start.toISOString());
    } else if (period === 'this_month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      query = query.gte('created_at', start.toISOString());
    } else if (period === 'custom' && start_date) {
      const end = end_date ? new Date(end_date) : new Date(start_date);
      end.setHours(23, 59, 59, 999);
      query = query
        .gte('created_at', new Date(start_date).toISOString())
        .lte('created_at', end.toISOString());
    }

    // ── Address search ─────────────────────────────────────────────────────
    if (q) {
      query = query.or(`pickup_address.ilike.%${q}%,drop_address.ilike.%${q}%`);
    }

    const { data: rides, error } = await query;
    if (error) throw error;

    // ── Build summary ──────────────────────────────────────────────────────
    const completedRides = (rides ?? []).filter(r => r.status === 'completed');
    const totalEarnings  = completedRides.reduce((s, r) => s + (r.total_fare ?? 0), 0);
    const periodLabel = {
      all: 'All Time', today: 'Today', this_week: 'This Week', this_month: 'This Month', custom: 'Custom Range',
    }[period] ?? period;
    const summary = {
      label:    `${periodLabel}: ${completedRides.length} Rides · ₹${totalEarnings}`,
      rides:    completedRides.length,
      earnings: totalEarnings,
    };

    return res.status(200).json({ rides: rides ?? [], summary });
  } catch (err) { return handleError(err, res, next); }
}

module.exports = {
  updateDriverStatus,
  getEarningsToday,
  getEarningsWeekly,
  getEarningsLedger,
  getDriverRides,
  getDriverProfile,
  updateDriverProfile,
  getSubscriptionStatus,
  getCommissionStatus,
  updateLocation,
};
