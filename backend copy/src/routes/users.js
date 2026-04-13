'use strict';

const { Router } = require('express');
const { z }      = require('zod');
const multer     = require('multer');
const authMiddleware = require('../middleware/authMiddleware');
const roleGuard      = require('../middleware/roleGuard');
const { apiLimiter } = require('../middleware/rateLimiter');
const supabase       = require('../config/supabase');
const logger         = require('../utils/logger');

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

module.exports = router;
