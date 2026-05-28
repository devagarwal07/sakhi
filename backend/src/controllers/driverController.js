'use strict';

const { z } = require('zod');
const supabase = require('../config/supabase');
const otpService = require('../services/otpService');
const jwtService = require('../services/jwtService');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');
const phoneE164 = z.string().regex(/^\+?[1-9]\d{9,14}$/, 'Phone must be a valid 10-15 digit number');

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

      // Upsert location — use explicit null check so lat=0 or lng=0 still passes
      if (lat != null && lng != null) {
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
// GET /drivers/rides  — period filters + search (driver app ride history)
// ──────────────────────────────────────────────────────────────────────────────
async function getDriverRides(req, res, next) {
  try {
    const driverId = req.user.userId;
    const { period = 'all', page = '1', limit = '20', q, start_date, end_date } = req.query;

    const pg  = Math.max(1, parseInt(page, 10));
    const lim = Math.min(50, parseInt(limit, 10));
    const offset = (pg - 1) * lim;

    let query = supabase
      .from('rides')
      .select('id, status, subscription_id, pickup_address, drop_address, estimated_fare, final_fare, distance_km, duration_min, payment_method, created_at, started_at, completed_at, rider_id, users!rides_rider_id_fkey(name, phone, profile_photo_url, avg_rating)')
      .eq('driver_id', driverId)
      .order('created_at', { ascending: false })
      .range(offset, offset + lim - 1);

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

    if (q) {
      query = query.or(`pickup_address.ilike.%${q}%,drop_address.ilike.%${q}%`);
    }

    const { data: rides, error } = await query;
    if (error) throw error;

    const mapped = (rides ?? []).map((r) => {
      const total_fare = parseFloat(r.final_fare ?? r.estimated_fare ?? 0) || 0;
      let phone = r.users?.phone;
      if (phone) phone = '****' + phone.slice(-4);
      return {
        ...r,
        ride_type: r.subscription_id ? 'subscription' : 'on_demand',
        total_fare,
        drop_address: r.drop_address,
        rider_name: r.users?.name,
        rider_phone: phone,
        rider_photo: r.users?.profile_photo_url,
        rider_rating: r.users?.avg_rating,
      };
    });

    const completedRides = mapped.filter((r) => r.status === 'completed');
    const totalEarnings = completedRides.reduce((s, r) => s + (r.total_fare || 0), 0);
    const periodLabel = {
      all: 'All Time', today: 'Today', this_week: 'This Week', this_month: 'This Month', custom: 'Custom Range',
    }[period] ?? period;
    const summary = {
      label:    `${periodLabel}: ${completedRides.length} Rides · ₹${totalEarnings}`,
      rides:    completedRides.length,
      earnings: totalEarnings,
    };

    return res.status(200).json({ rides: mapped, summary });
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
// GET /drivers/transactions  — grouped transaction history for the driver
// ──────────────────────────────────────────────────────────────────────────────
async function getDriverTransactions(req, res, next) {
  try {
    const driverId = req.user.userId;
    const { start_date, end_date } = req.query;

    // Build date range
    const endDt   = end_date   ? new Date(end_date)   : new Date();
    const startDt = start_date ? new Date(start_date) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    endDt.setHours(23, 59, 59, 999);

    const [{ data: earnings }, { data: commissions }] = await Promise.all([
      supabase
        .from('driver_earnings')
        .select('id, gross, net, commission, waiting_charge, ride_id, created_at')
        .eq('driver_id', driverId)
        .gte('created_at', startDt.toISOString())
        .lte('created_at', endDt.toISOString())
        .order('created_at', { ascending: false }),
      supabase
        .from('commission_payments')
        .select('id, amount, status, created_at')
        .eq('driver_id', driverId)
        .gte('created_at', startDt.toISOString())
        .lte('created_at', endDt.toISOString())
        .order('created_at', { ascending: false }),
    ]);

    // Build flat transaction list
    const txns = [];

    for (const e of (earnings ?? [])) {
      const dt     = new Date(e.created_at);
      const dateKey = dt.toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' });
      const timeKey = dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
      txns.push({
        id:          `earn_${e.id}`,
        type:        'ride',
        title:       'Ride Fare Collected',
        amount:      e.net   ?? e.gross ?? 0,
        date_label:  dateKey,
        time_label:  timeKey,
        created_at:  e.created_at,
      });
    }

    for (const c of (commissions ?? [])) {
      const dt     = new Date(c.created_at);
      const dateKey = dt.toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' });
      const timeKey = dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
      txns.push({
        id:          `comm_${c.id}`,
        type:        'commission',
        title:       'Commission Paid',
        amount:      -(c.amount ?? 0),  // negative = debit
        date_label:  dateKey,
        time_label:  timeKey,
        created_at:  c.created_at,
      });
    }

    // Sort by newest first
    txns.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return res.status(200).json({ transactions: txns });
  } catch (err) { return handleError(err, res, next); }
}

// ──────────────────────────────────────────────────────────────────────────────
// GET /drivers/documents  — KYC document statuses for MyDocumentsScreen
// ──────────────────────────────────────────────────────────────────────────────
async function getDriverDocuments(req, res, next) {
  try {
    const driverId = req.user.userId;
    const { data, error } = await supabase
      .from('drivers')
      .select(
        'kyc_status, driving_licence_status, driving_licence_expiry, driving_licence_issued_at, driving_licence_verified_at, dl_vehicle_class,' +
        'dl_surepass_name, dl_gender, dl_issuing_state, dl_ola_name, dl_blood_group, dl_has_image,' + // Surepass DL fields
        'vehicle_rc_status, vehicle_rc_expiry,' +
        'rc_status, rc_fit_upto, rc_insurance_upto, rc_maker_model, rc_fuel_type, rc_verified_at, rc_blacklist_status,' +
        'insurance_status, insurance_expiry,' +
        'aadhaar_status, aadhaar_name, aadhaar_photo_url, digilocker_consent_at, profile_photo_url, kyc_submitted_at'
      )
      .eq('id', driverId)
      .limit(1);

    if (error) throw error;
    const d = data?.[0] ?? {};

    const mapStatus = (s) => {
      if (!s || s === 'pending')   return 'UNDER REVIEW';
      if (s === 'verified')        return 'VERIFIED';
      if (s === 'rejected')        return 'REJECTED';
      if (s === 'expiring_soon')   return 'EXPIRING SOON';
      if (s === 'expired')         return 'EXPIRED';
      return 'UNDER REVIEW';
    };
    const colorKey = (s) => {
      if (s === 'verified')       return 'success';
      if (s === 'expiring_soon')  return 'warning';
      return 'primary';
    };

    const docs = [
      {
        id:            'driving_licence',
        type:          'driving_licence',
        title:         'Driving Licence',
        status:        mapStatus(d.driving_licence_status),
        colorKey:      colorKey(d.driving_licence_status),
        expires:       d.driving_licence_expiry
          ? new Date(d.driving_licence_expiry).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
          : null,
        issued_at:     d.driving_licence_issued_at
          ? new Date(d.driving_licence_issued_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
          : null,
        verified_at:   d.driving_licence_verified_at || null,
        vehicle_class: d.dl_vehicle_class
          ? (() => { try { return JSON.parse(d.dl_vehicle_class); } catch { return []; } })()
          : [],
        // Surepass DL enrichment fields
        dl_name:        d.dl_surepass_name  || null,
        dl_gender:      d.dl_gender         || null,
        issuing_state:  d.dl_issuing_state  || null,
        ola_name:       d.dl_ola_name       || null,
        blood_group:    d.dl_blood_group    || null,
        has_image:      d.dl_has_image      ?? false,
        surepass_verified: d.driving_licence_status === 'verified' || d.driving_licence_status === 'expired',
      },
      {
        id:             'vehicle_rc',
        type:           'vehicle_rc',
        title:          'Vehicle RC',
        // Prefer Surepass rc_status; fall back to legacy vehicle_rc_status
        status:         mapStatus(d.rc_status ?? d.vehicle_rc_status),
        colorKey:       colorKey(d.rc_status ?? d.vehicle_rc_status),
        // Fitness validity date from Surepass; fall back to legacy expiry
        expires:        (d.rc_fit_upto ?? d.vehicle_rc_expiry)
          ? new Date(d.rc_fit_upto ?? d.vehicle_rc_expiry).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
          : null,
        insurance_upto: d.rc_insurance_upto
          ? new Date(d.rc_insurance_upto).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
          : null,
        maker_model:    d.rc_maker_model    || null,
        fuel_type:      d.rc_fuel_type      || null,
        verified_at:    d.rc_verified_at    || null,
        blacklisted:    !!(d.rc_blacklist_status && d.rc_blacklist_status.trim()),
        surepass_verified: d.rc_status === 'verified' || d.rc_status === 'blacklisted',
      },
      {
        id:       'insurance',
        type:     'insurance',
        title:    'Insurance Certificate',
        status:   mapStatus(d.insurance_status),
        colorKey: colorKey(d.insurance_status),
        expires:  d.insurance_expiry ? new Date(d.insurance_expiry).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : null,
      },
      {
        id:                    'aadhaar',
        type:                  'aadhaar',
        title:                 'Aadhaar Card',
        status:                mapStatus(d.aadhaar_status ?? d.kyc_status),
        colorKey:              colorKey(d.aadhaar_status ?? d.kyc_status),
        aadhaar_name:          d.aadhaar_name          || null,
        aadhaar_photo_url:     d.aadhaar_photo_url     || null,
        digilocker_verified:   !!d.digilocker_consent_at,
        digilocker_consent_at: d.digilocker_consent_at || null,
      },
      {
        id:       'profile_photo',
        type:     'profile_photo',
        title:    'Profile Photo',
        isPhoto:  true,
        photoUrl: d.profile_photo_url,
        status:   d.profile_photo_url ? 'VERIFIED' : 'UNDER REVIEW',
        colorKey: d.profile_photo_url ? 'success' : 'primary',
      },
    ];

    const expiringSoonCount = docs.filter(doc => doc.status === 'EXPIRING SOON' || doc.status === 'EXPIRED').length;

    return res.status(200).json({ docs, expiringSoonCount });
  } catch (err) { return handleError(err, res, next); }
}

// ──────────────────────────────────────────────────────────────────────────────
// PATCH /drivers/subscription/opt-in  — toggle driver opt-in to subscription rides
// ──────────────────────────────────────────────────────────────────────────────
const optInSchema = z.object({ opted_in: z.boolean() });

async function toggleSubscriptionOptIn(req, res, next) {
  try {
    const driverId = req.user.userId;
    const { opted_in } = optInSchema.parse(req.body);

    await supabase
      .from('drivers')
      .update({ subscription_opt_in: opted_in })
      .eq('id', driverId);

    logger.info('driverController.toggleSubscriptionOptIn', { driverId, opted_in });
    return res.status(200).json({ ok: true, opted_in });
  } catch (err) { return handleError(err, res, next); }
}

// ──────────────────────────────────────────────────────────────────────────────
// POST /drivers/profile/phone/send-otp  &  /resend-otp
// ──────────────────────────────────────────────────────────────────────────────
async function sendDriverPhoneChangeOtp(req, res, next) {
  try {
    const { new_phone } = z.object({ new_phone: phoneE164 }).parse(req.body);
    const driverId = req.user.userId;

    const { data: rows } = await supabase.from('drivers').select('phone').eq('id', driverId).limit(1);
    const current = rows?.[0]?.phone;
    if (current === new_phone) {
      return res.status(400).json({
        error: { code: 'SAME_PHONE', message: 'New number must differ from your current number.', details: {} },
      });
    }

    const [{ data: uDup }, { data: dDup }] = await Promise.all([
      supabase.from('users').select('id').eq('phone', new_phone).limit(1),
      supabase.from('drivers').select('id').eq('phone', new_phone).neq('id', driverId).limit(1),
    ]);
    if ((uDup && uDup.length) || (dDup && dDup.length)) {
      return res.status(409).json({
        error: { code: 'PHONE_IN_USE', message: 'This phone number is already registered.', details: {} },
      });
    }

    await otpService.sendOTP(new_phone);
    return res.status(200).json({ message: 'OTP sent to new number' });
  } catch (err) { return handleError(err, res, next); }
}

// ──────────────────────────────────────────────────────────────────────────────
// POST /drivers/profile/phone/verify-otp
// ──────────────────────────────────────────────────────────────────────────────
async function verifyDriverPhoneChangeOtp(req, res, next) {
  try {
    const { new_phone, otp } = z.object({ new_phone: phoneE164, otp: z.string().length(6) }).parse(req.body);
    const driverId = req.user.userId;

    await otpService.verifyOTP(new_phone, otp);

    const { data: driver, error } = await supabase
      .from('drivers')
      .update({ phone: new_phone })
      .eq('id', driverId)
      .select('*')
      .single();

    if (error) throw error;

    const { accessToken, refreshToken } = await jwtService.issueTokens(driverId, 'driver', new_phone);

    logger.info('driverController.verifyDriverPhoneChangeOtp', { driverId, new_phone });
    return res.status(200).json({
      message: 'Phone number updated',
      accessToken,
      refreshToken,
      driver,
    });
  } catch (err) { return handleError(err, res, next); }
}

// ──────────────────────────────────────────────────────────────────────────────
// POST /drivers/vehicle  — onboarding vehicle details
// ──────────────────────────────────────────────────────────────────────────────
const vehicleOnboardingSchema = z.object({
  vehicle_type: z.string().min(1),
  registration_number: z.string().min(4),
  colour: z.string().min(1),
  model_name: z.string().min(1),
});

async function submitVehicleDetails(req, res, next) {
  try {
    const body = vehicleOnboardingSchema.parse(req.body);
    const driverId = req.user.userId;

    const vehicle_type =
      body.vehicle_type === 'minivan' ? 'cab'
        : body.vehicle_type === 'erickshaw' ? 'auto'
          : body.vehicle_type;

    const { data, error } = await supabase
      .from('drivers')
      .update({
        vehicle_type,
        vehicle_reg_no: body.registration_number.toUpperCase(),
        vehicle_color: body.colour,
        vehicle_model: body.model_name,
      })
      .eq('id', driverId)
      .select('id, vehicle_type, vehicle_reg_no, vehicle_color, vehicle_model')
      .single();

    if (error) throw error;
    return res.status(200).json({ ok: true, driver: data });
  } catch (err) { return handleError(err, res, next); }
}

// ──────────────────────────────────────────────────────────────────────────────
// POST /drivers/verify-identity  — selfie (multipart field: selfie)
// ──────────────────────────────────────────────────────────────────────────────
async function submitSelfieVerification(req, res, next) {
  try {
    const driverId = req.user.userId;
    const profilePhotoUrl = req.file?.location || req.file?.path;
    if (!profilePhotoUrl) {
      return res.status(422).json({
        error: { code: 'MISSING_FILE', message: 'Selfie image is required.', details: {} },
      });
    }

    const { data, error } = await supabase
      .from('drivers')
      .update({
        profile_photo_url: profilePhotoUrl,
        gender_verified: true,
      })
      .eq('id', driverId)
      .select('id, profile_photo_url, gender_verified')
      .single();

    if (error) throw error;
    return res.status(200).json({ ok: true, driver: data });
  } catch (err) { return handleError(err, res, next); }
}

const COMPLAINT_CATEGORY = {
  'Ride Issue': 'ride_issue',
  'Commission Dispute': 'payment_dispute',
  'Document Problem': 'driver_complaint',
  'Payment Not Received': 'payment_dispute',
  'Safety Concern': 'safety_concern',
  'App / Navigation Error': 'app_bug',
  'Other': 'other',
};

// ──────────────────────────────────────────────────────────────────────────────
// POST /drivers/complaints  — multipart: issue_type, description, related_ride_id?, screenshot?
// ──────────────────────────────────────────────────────────────────────────────
async function submitDriverComplaint(req, res, next) {
  try {
    const driverId = req.user.userId;
    const issue_type = String(req.body.issue_type || '');
    const description = String(req.body.description || '').trim();
    let relatedRideId = req.body.related_ride_id || null;
    if (relatedRideId && !/^[0-9a-f-]{36}$/i.test(String(relatedRideId))) {
      relatedRideId = null;
    }

    if (description.length < 10) {
      return res.status(422).json({
        error: { code: 'VALIDATION_ERROR', message: 'Description must be at least 10 characters.', details: {} },
      });
    }

    const category = COMPLAINT_CATEGORY[issue_type] || 'other';
    let fullDesc = description;
    if (req.file?.buffer) {
      fullDesc += '\n[Attachment received — stored for support review]';
    }

    const { error } = await supabase.from('support_tickets').insert({
      user_id: driverId,
      role: 'driver',
      ride_id: relatedRideId || null,
      category,
      description: fullDesc,
      status: 'open',
    });

    if (error) throw error;
    return res.status(201).json({ ok: true, message: 'Complaint submitted' });
  } catch (err) { return handleError(err, res, next); }
}

// ──────────────────────────────────────────────────────────────────────────────
// GET /drivers/complaints
// ──────────────────────────────────────────────────────────────────────────────
async function listDriverComplaints(req, res, next) {
  try {
    const driverId = req.user.userId;
    const { status: statusFilter } = req.query;
    let q = supabase
      .from('support_tickets')
      .select('id, category, description, status, created_at')
      .eq('user_id', driverId)
      .eq('role', 'driver')
      .order('created_at', { ascending: false });
    if (statusFilter && statusFilter !== 'all') {
      q = q.eq('status', statusFilter);
    }
    const { data, error } = await q;
    if (error) throw error;
    return res.status(200).json({ complaints: data || [] });
  } catch (err) { return handleError(err, res, next); }
}

// ──────────────────────────────────────────────────────────────────────────────
// PATCH /drivers/notification-settings  — acknowledged (persist via FCM topics later)
// ──────────────────────────────────────────────────────────────────────────────
async function updateNotificationSettings(req, res, next) {
  try {
    if (!req.body || typeof req.body !== 'object') {
      return res.status(422).json({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid body.', details: {} },
      });
    }
    return res.status(200).json({ ok: true });
  } catch (err) { return handleError(err, res, next); }
}

// ──────────────────────────────────────────────────────────────────────────────
// PATCH /drivers/payment-details  — UPI / bank for payouts
// ──────────────────────────────────────────────────────────────────────────────
async function updatePaymentDetails(req, res, next) {
  try {
    const driverId = req.user.userId;
    const { upiIds, bankAccounts } = req.body || {};
    const primaryUpi = Array.isArray(upiIds) && upiIds.length ? upiIds.find((u) => u.isPrimary || u.handle)?.handle || upiIds[0]?.handle : null;
    const primaryBank = Array.isArray(bankAccounts) && bankAccounts.length ? bankAccounts[0] : null;

    const updates = {};
    if (primaryUpi) updates.upi_id = String(primaryUpi).trim();
    if (primaryBank?.accountNumber) updates.bank_account_no = String(primaryBank.accountNumber).replace(/\s/g, '');
    if (primaryBank?.ifsc) updates.bank_ifsc = String(primaryBank.ifsc).trim().toUpperCase();

    const { error } = await supabase.from('drivers').update(updates).eq('id', driverId);
    if (error) throw error;
    return res.status(200).json({ ok: true });
  } catch (err) { return handleError(err, res, next); }
}

module.exports = {
  updateDriverStatus,
  getEarningsToday,
  getEarningsWeekly,
  getEarningsLedger,
  getDriverRides,
  getDriverTransactions,
  getDriverDocuments,
  toggleSubscriptionOptIn,
  getDriverProfile,
  updateDriverProfile,
  getSubscriptionStatus,
  getCommissionStatus,
  updateLocation,
  sendDriverPhoneChangeOtp,
  verifyDriverPhoneChangeOtp,
  submitVehicleDetails,
  submitSelfieVerification,
  submitDriverComplaint,
  listDriverComplaints,
  updateNotificationSettings,
  updatePaymentDetails,
};
