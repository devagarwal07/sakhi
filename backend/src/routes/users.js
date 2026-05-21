'use strict';

const { Router } = require('express');
const { z }      = require('zod');
const multer     = require('multer');
const authMiddleware = require('../middleware/authMiddleware');
const roleGuard      = require('../middleware/roleGuard');
const { apiLimiter } = require('../middleware/rateLimiter');
const supabase       = require('../config/supabase');
const logger         = require('../utils/logger');
const fcmService     = require('../services/fcmService');

const router = Router();
router.use(apiLimiter);

// ── Multer for avatar uploads (in-memory) ─────────────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    if (['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(Object.assign(new Error('Only JPEG/PNG/WEBP images allowed'), { code: 'INVALID_FILE_TYPE' }));
    }
  },
});

// ── Zod schemas ────────────────────────────────────────────────────────────────
const updateProfileSchema = z.object({
  name:               z.string().min(1).max(128).optional(),
  email:              z.string().email().optional(),
  accessibility_notes:z.string().max(512).optional(),
});

const addressSchema = z.object({
  label:   z.enum(['home', 'work', 'other']),
  address: z.string().min(1).max(256),
  lat:     z.number().optional(),
  lng:     z.number().optional(),
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /users/profile
// ─────────────────────────────────────────────────────────────────────────────
router.get('/profile', authMiddleware, roleGuard('rider'), async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.user.userId)
      .single();
    if (error) throw error;
    return res.json({ user: data });
  } catch (err) {
    return next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /users/profile
// ─────────────────────────────────────────────────────────────────────────────
router.put('/profile', authMiddleware, roleGuard('rider'), upload.single('avatar'), async (req, res, next) => {
  try {
    // Text fields in body (multipart) 
    const parsed = updateProfileSchema.safeParse({
      name:               req.body.name,
      email:              req.body.email,
      accessibility_notes:req.body.accessibility_notes,
    });
    if (!parsed.success) {
      return res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid fields', details: parsed.error.flatten() } });
    }

    const updates = { updated_at: new Date().toISOString() };
    if (parsed.data.name)               updates.name                = parsed.data.name;
    if (parsed.data.email)              updates.email               = parsed.data.email;
    if (parsed.data.accessibility_notes !== undefined) 
                                        updates.accessibility_notes = parsed.data.accessibility_notes;

    // Handle avatar upload to Supabase Storage if file was attached
    if (req.file) {
      const ext      = req.file.mimetype === 'image/png' ? 'png' : 'jpg';
      const filePath = `avatars/${req.user.userId}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from('user-media')
        .upload(filePath, req.file.buffer, { contentType: req.file.mimetype, upsert: true });
      if (!uploadErr) {
        const { data: urlData } = supabase.storage.from('user-media').getPublicUrl(filePath);
        updates.avatar_url = urlData.publicUrl;
      }
    }

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', req.user.userId)
      .select('*')
      .single();
    if (error) throw error;
    return res.json({ user: data });
  } catch (err) {
    return next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /users/addresses
// ─────────────────────────────────────────────────────────────────────────────
router.get('/addresses', authMiddleware, roleGuard('rider'), async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('user_addresses')
      .select('*')
      .eq('user_id', req.user.userId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return res.json({ addresses: data });
  } catch (err) {
    return next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /users/addresses
// ─────────────────────────────────────────────────────────────────────────────
router.post('/addresses', authMiddleware, roleGuard('rider'), async (req, res, next) => {
  try {
    const parsed = addressSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid address', details: parsed.error.flatten() } });
    }
    const { data, error } = await supabase
      .from('user_addresses')
      .insert({ user_id: req.user.userId, ...parsed.data })
      .select('*')
      .single();
    if (error) throw error;
    return res.status(201).json({ address: data });
  } catch (err) {
    return next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /users/addresses/:id
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/addresses/:id', authMiddleware, roleGuard('rider'), async (req, res, next) => {
  try {
    const { error } = await supabase
      .from('user_addresses')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user.userId); // scoped to this user only
    if (error) throw error;
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /users/rides?page=1  (ride history)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/rides', authMiddleware, roleGuard('rider'), async (req, res, next) => {
  try {
    const page  = Math.max(parseInt(req.query.page || '1', 10), 1);
    const limit = 20;
    const from  = (page - 1) * limit;
    const to    = from + limit - 1;

    const { data, error, count } = await supabase
      .from('rides')
      .select('*, drivers(name, vehicle_model, plate_number, avatar_url)', { count: 'exact' })
      .eq('rider_id', req.user.userId)
      .in('status', ['completed', 'cancelled'])
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;
    return res.json({ rides: data, total: count, page, limit });
  } catch (err) {
    return next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /users/transactions?page=1
// ─────────────────────────────────────────────────────────────────────────────
router.get('/transactions', authMiddleware, roleGuard('rider'), async (req, res, next) => {
  try {
    const page  = Math.max(parseInt(req.query.page || '1', 10), 1);
    const limit = 20;
    const from  = (page - 1) * limit;
    const to    = from + limit - 1;

    const { data, error, count } = await supabase
      .from('wallet_transactions')
      .select('*', { count: 'exact' })
      .eq('user_id', req.user.userId)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;
    return res.json({ transactions: data, total: count, page, limit });
  } catch (err) {
    return next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /users/wallet
// ─────────────────────────────────────────────────────────────────────────────
router.get('/wallet', authMiddleware, roleGuard('rider'), async (req, res, next) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('wallet_credits, referral_code')
      .eq('id', req.user.userId)
      .single();
    if (error) throw error;

    // Fetch recent transaction history (last 10)
    const { data: history } = await supabase
      .from('wallet_transactions')
      .select('id, type, amount, description, created_at')
      .eq('user_id', req.user.userId)
      .order('created_at', { ascending: false })
      .limit(10);

    return res.json({
      wallet: {
        balance:       parseFloat(user.wallet_credits || 0),
        referral_code: user.referral_code,
        history:       (history || []).map(tx => ({
          ...tx,
          date: new Date(tx.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        })),
      },
    });
  } catch (err) {
    return next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /users/account
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/account', authMiddleware, roleGuard('rider'), async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const { data: userRow, error: userErr } = await supabase
      .from('users')
      .select('id, name, phone')
      .eq('id', userId)
      .single();
    if (userErr) throw userErr;

    const activeStatuses = ['searching', 'assigned', 'driver_en_route', 'arrived', 'in_progress'];
    const { data: activeRides, error: activeErr } = await supabase
      .from('rides')
      .select('id')
      .eq('rider_id', userId)
      .in('status', activeStatuses)
      .limit(1);
    if (activeErr) throw activeErr;
    if (activeRides?.length) {
      return res.status(409).json({
        error: { code: 'ACTIVE_RIDE', message: 'Please complete or cancel your active ride before deleting the account.', details: {} },
      });
    }

    const { data: rideRows, error: rideErr } = await supabase
      .from('rides')
      .select('id')
      .eq('rider_id', userId);
    if (rideErr) throw rideErr;

    const rideIds = (rideRows || []).map((r) => r.id);

    const { data: subscriptionRows, error: subscriptionErr } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('rider_id', userId);
    if (subscriptionErr) throw subscriptionErr;

    const subscriptionIds = (subscriptionRows || []).map((s) => s.id);

    if (subscriptionIds.length) {
      const { data: subscriptionRideRows, error: subscriptionRideErr } = await supabase
        .from('subscription_rides')
        .select('id')
        .in('subscription_id', subscriptionIds);
      if (subscriptionRideErr) throw subscriptionRideErr;

      const subscriptionRideIds = (subscriptionRideRows || []).map((sr) => sr.id);

      if (subscriptionRideIds.length) {
        const { error: blocksErr } = await supabase
          .from('driver_blocks')
          .delete()
          .in('subscription_ride_id', subscriptionRideIds);
        if (blocksErr) throw blocksErr;
      }

      const { error: subRideDeleteErr } = await supabase
        .from('subscription_rides')
        .delete()
        .in('subscription_id', subscriptionIds);
      if (subRideDeleteErr) throw subRideDeleteErr;
    }

    if (rideIds.length) {
      const deleteByRideId = async (table) => {
        const { error } = await supabase.from(table).delete().in('ride_id', rideIds);
        if (error) throw error;
      };

      await deleteByRideId('ride_chat_messages');
      await deleteByRideId('sos_events');
      await deleteByRideId('anomaly_alerts');
      await deleteByRideId('driver_earnings');
      await deleteByRideId('payout_transactions');
      await deleteByRideId('support_tickets');
      await deleteByRideId('rider_ratings');

      const { error: ridesDeleteErr } = await supabase.from('rides').delete().in('id', rideIds);
      if (ridesDeleteErr) throw ridesDeleteErr;
    }

    const deleteByUserId = async (table) => {
      const { error } = await supabase.from(table).delete().eq('user_id', userId);
      if (error) throw error;
    };

    await supabase.from('driver_blocks').delete().eq('rider_id', userId);
    await deleteByUserId('emergency_contacts');
    await deleteByUserId('user_addresses');
    await deleteByUserId('wallet_transactions');
    await deleteByUserId('notifications_log');
    await deleteByUserId('support_sessions');
    await deleteByUserId('support_tickets');
    await deleteByUserId('sos_events');

    const { error: referralsErr } = await supabase
      .from('referrals')
      .delete()
      .or(`referrer_id.eq.${userId},referred_id.eq.${userId}`);
    if (referralsErr) throw referralsErr;

    const { error: refreshErr } = await supabase.from('refresh_tokens').delete().eq('user_id', userId);
    if (refreshErr) throw refreshErr;

    const { error: subscriptionsErr } = await supabase.from('subscriptions').delete().eq('rider_id', userId);
    if (subscriptionsErr) throw subscriptionsErr;

    const { error: userDeleteErr } = await supabase.from('users').delete().eq('id', userId);
    if (userDeleteErr) throw userDeleteErr;

    const supportFcm = process.env.SUPPORT_FCM_TOKEN;
    if (supportFcm) {
      const userName = userRow?.name || 'Unknown';
      const userPhone = userRow?.phone || 'Unknown';
      fcmService.sendRaw(supportFcm, {
        title: 'Account Deleted',
        body: `Rider ${userName} (${userPhone}) deleted their account.`,
        data: { type: 'ACCOUNT_DELETED', user_id: userId },
      }).catch(() => {});
    }

    logger.info('users.deleteAccount', { userId, rideCount: rideIds.length });
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /users/referrals/share-sms (Rider only)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/referrals/share-sms', authMiddleware, roleGuard('rider'), async (req, res, next) => {
  try {
    const parsed = z.object({
      friend_phone: z.string().min(10).max(15)
    }).safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({ error: 'friend_phone is required and must be a valid 10-15 digit string' });
    }

    const { friend_phone } = parsed.data;

    // Fetch user's referral code
    const { data: user, error } = await supabase
      .from('users')
      .select('referral_code')
      .eq('id', req.user.userId)
      .single();

    if (error || !user?.referral_code) {
      return res.status(404).json({ error: 'Referral code not found' });
    }

    const smsService = require('../services/smsService');
    
    // Exact matching pattern for DLT:
    // SAKHI MOBILITY: Your referral code is{#var#} . Please share it with friends and family.
    const formattedMessage = `SAKHI MOBILITY: Your referral code is${user.referral_code} . Please share it with friends and family.`;

    const smsResult = await smsService.sendSMS(friend_phone, formattedMessage, smsService.FORTIUS_TEMPLATES.SAKHI_REFERRAL);

    if (smsResult.sent) {
      return res.json({ success: true, message: 'Referral code sent successfully via SMS' });
    } else {
      return res.status(500).json({ success: false, error: smsResult.reason });
    }
  } catch (err) {
    return next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /users/referral/apply — apply a referral code (entered by the user)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/referral/apply', authMiddleware, roleGuard('rider'), async (req, res, next) => {
  try {
    const parsed = z.object({
      referral_code: z.string().min(4).max(20).toUpperCase(),
    }).safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'referral_code is required (4–20 characters)', details: parsed.error.flatten() } });
    }

    const fareService = require('../services/fareService');
    const result = await fareService.applyReferralCode(req.user.userId, parsed.data.referral_code);

    return res.json({
      success:       result.success,
      referee_credit: result.referee_credit,
      message:       `Referral applied! ₹${result.referee_credit} wallet credit has been added to your account.`,
    });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ error: { code: err.code, message: err.message } });
    }
    return next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /users/referral  — get my referral code + stats
// ─────────────────────────────────────────────────────────────────────────────
router.get('/referral', authMiddleware, roleGuard('rider'), async (req, res, next) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('referral_code, wallet_credits, referred_by_code')
      .eq('id', req.user.userId)
      .single();

    if (error) throw error;

    // Count how many people used this user's code
    const { count: referralCount } = await supabase
      .from('referrals')
      .select('id', { count: 'exact', head: true })
      .eq('referrer_id', req.user.userId);

    // Count completed referrals (earned rewards)
    const { count: completedCount } = await supabase
      .from('referrals')
      .select('id', { count: 'exact', head: true })
      .eq('referrer_id', req.user.userId)
      .eq('referral_status', 'completed');

    return res.json({
      referral_code:    user.referral_code,
      wallet_credits:   parseFloat(user.wallet_credits || 0),
      referred_by_code: user.referred_by_code || null,
      stats: {
        total_referred:     referralCount   || 0,
        completed_referrals: completedCount || 0,
      },
    });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
