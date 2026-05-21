'use strict';

/**
 * /coupons  — Admin-facing CRUD for promo_discounts table.
 * All routes require admin JWT + roleGuard('admin').
 *
 * GET    /coupons          — list all coupons (paginated, filterable)
 * POST   /coupons          — create a new coupon
 * GET    /coupons/:id      — get single coupon
 * PUT    /coupons/:id      — update coupon
 * DELETE /coupons/:id      — soft-delete (is_active = false) or hard delete
 */

const { Router } = require('express');
const { z }      = require('zod');
const authMiddleware = require('../middleware/authMiddleware');
const roleGuard      = require('../middleware/roleGuard');
const supabase       = require('../config/supabase');
const logger         = require('../utils/logger');
const { adminLimiter } = require('../middleware/rateLimiter');

const router = Router();
router.use(adminLimiter, authMiddleware, roleGuard('admin'));

// ── Zod schema ────────────────────────────────────────────────────────────────
const couponSchema = z.object({
  code:              z.string().min(3).max(20).transform((v) => v.toUpperCase().replace(/[^A-Z0-9]/g, '')),
  discount_type:     z.enum(['percentage', 'flat']).default('percentage'),
  discount_pct:      z.coerce.number().min(0).max(100).nullable().optional(),
  flat_amount:       z.coerce.number().min(0).nullable().optional(),
  max_discount_cap:  z.coerce.number().min(0).nullable().optional(),
  description:       z.string().max(500).nullable().optional(),
  valid_from:        z.string().min(1),           // ISO date string
  valid_to:          z.string().min(1),            // ISO date string (mapped from validUntil)
  min_fare:          z.coerce.number().min(0).default(0),
  max_uses:          z.coerce.number().int().min(1).nullable().optional(),
  max_uses_per_user: z.coerce.number().int().min(1).nullable().optional(),
  applicable_rides:  z.enum(['all', 'first_ride', 'nth_ride']).default('all'),
  is_active:         z.boolean().default(true),
}).superRefine((data, ctx) => {
  if (data.discount_type === 'percentage' && (data.discount_pct == null || data.discount_pct < 1)) {
    ctx.addIssue({ code: 'custom', path: ['discount_pct'], message: 'discount_pct is required for percentage type' });
  }
  if (data.discount_type === 'flat' && (data.flat_amount == null || data.flat_amount < 1)) {
    ctx.addIssue({ code: 'custom', path: ['flat_amount'], message: 'flat_amount is required for flat type' });
  }
});

// Support camelCase from the admin frontend too (validUntil → valid_to, etc.)
function normaliseCouponBody(body) {
  return {
    code:              body.code,
    discount_type:     body.discount_type     || body.discountType     || 'percentage',
    discount_pct:      body.discount_pct      ?? body.discountPercentage ?? null,
    flat_amount:       body.flat_amount       ?? body.flatAmount       ?? null,
    max_discount_cap:  body.max_discount_cap  ?? body.maxDiscountCap   ?? null,
    description:       body.description       || null,
    valid_from:        body.valid_from        || body.validFrom        || null,
    valid_to:          body.valid_to          || body.validUntil       || null,
    min_fare:          body.min_fare          ?? body.minFareAmount    ?? 0,
    max_uses:          body.max_uses          ?? body.usageLimit       ?? null,
    max_uses_per_user: body.max_uses_per_user ?? body.maxUsesPerUser   ?? null,
    applicable_rides:  body.applicable_rides  || body.applicableRides  || 'all',
    is_active:         body.is_active         ?? body.isActive         ?? true,
  };
}

// ── GET /coupons ──────────────────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page  || '1',  10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '20', 10)));
    const from  = (page - 1) * limit;

    let query = supabase
      .from('promo_discounts')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (req.query.is_active !== undefined) {
      query = query.eq('is_active', req.query.is_active === 'true');
    }
    if (req.query.search) {
      query = query.or(`code.ilike.%${req.query.search}%,description.ilike.%${req.query.search}%`);
    }

    const { data, count, error } = await query.range(from, from + limit - 1);
    if (error) return next(error);

    return res.json({
      coupons:     data || [],
      total:       count || 0,
      page,
      limit,
      total_pages: Math.ceil((count || 0) / limit) || 1,
    });
  } catch (err) { return next(err); }
});

// ── GET /coupons/:id ──────────────────────────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('promo_discounts')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error || !data) return res.status(404).json({ error: { code: 'COUPON_NOT_FOUND', message: 'Coupon not found' } });
    return res.json({ coupon: data });
  } catch (err) { return next(err); }
});

// ── POST /coupons ─────────────────────────────────────────────────────────────
router.post('/', async (req, res, next) => {
  try {
    const parsed = couponSchema.safeParse(normaliseCouponBody(req.body));
    if (!parsed.success) {
      return res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid coupon data', details: parsed.error.flatten() } });
    }

    const d = parsed.data;

    // Ensure code is unique
    const { data: existing } = await supabase
      .from('promo_discounts')
      .select('id')
      .eq('code', d.code)
      .limit(1);
    if (existing?.length) {
      return res.status(409).json({ error: { code: 'CODE_EXISTS', message: `Coupon code '${d.code}' already exists.` } });
    }

    const { data: row, error: insertErr } = await supabase
      .from('promo_discounts')
      .insert({
        code:              d.code,
        discount_type:     d.discount_type,
        discount_pct:      d.discount_type === 'percentage' ? d.discount_pct : null,
        flat_amount:       d.discount_type === 'flat'       ? d.flat_amount  : null,
        max_discount_cap:  d.discount_type === 'percentage' ? d.max_discount_cap : null,
        description:       d.description   || null,
        valid_from:        d.valid_from,
        valid_to:          d.valid_to,
        min_fare:          d.min_fare       || 0,
        max_uses:          d.max_uses       || null,
        max_uses_per_user: d.max_uses_per_user || null,
        applicable_rides:  d.applicable_rides,
        is_active:         d.is_active,
        used_count:        0,
      })
      .select('*')
      .single();

    if (insertErr) return next(insertErr);

    logger.info('admin — coupon created', { code: d.code, adminId: req.user.userId });
    return res.status(201).json({ coupon: row });
  } catch (err) { return next(err); }
});

// ── PUT /coupons/:id ──────────────────────────────────────────────────────────
router.put('/:id', async (req, res, next) => {
  try {
    const parsed = couponSchema.safeParse(normaliseCouponBody(req.body));
    if (!parsed.success) {
      return res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid coupon data', details: parsed.error.flatten() } });
    }

    const d = parsed.data;

    // Check code uniqueness (allow same code for this record)
    const { data: existing } = await supabase
      .from('promo_discounts')
      .select('id')
      .eq('code', d.code)
      .neq('id', req.params.id)
      .limit(1);
    if (existing?.length) {
      return res.status(409).json({ error: { code: 'CODE_EXISTS', message: `Coupon code '${d.code}' already exists.` } });
    }

    const { data: row, error: updateErr } = await supabase
      .from('promo_discounts')
      .update({
        code:              d.code,
        discount_type:     d.discount_type,
        discount_pct:      d.discount_type === 'percentage' ? d.discount_pct : null,
        flat_amount:       d.discount_type === 'flat'       ? d.flat_amount  : null,
        max_discount_cap:  d.discount_type === 'percentage' ? d.max_discount_cap : null,
        description:       d.description   || null,
        valid_from:        d.valid_from,
        valid_to:          d.valid_to,
        min_fare:          d.min_fare       || 0,
        max_uses:          d.max_uses       || null,
        max_uses_per_user: d.max_uses_per_user || null,
        applicable_rides:  d.applicable_rides,
        is_active:         d.is_active,
        updated_at:        new Date().toISOString(),
      })
      .eq('id', req.params.id)
      .select('*')
      .single();

    if (updateErr) return next(updateErr);
    if (!row) return res.status(404).json({ error: { code: 'COUPON_NOT_FOUND', message: 'Coupon not found' } });

    logger.info('admin — coupon updated', { id: req.params.id, code: d.code, adminId: req.user.userId });
    return res.json({ coupon: row });
  } catch (err) { return next(err); }
});

// ── DELETE /coupons/:id ───────────────────────────────────────────────────────
router.delete('/:id', async (req, res, next) => {
  try {
    // Soft delete: set is_active = false. Use ?hard=true to actually delete.
    if (req.query.hard === 'true') {
      const { error } = await supabase.from('promo_discounts').delete().eq('id', req.params.id);
      if (error) return next(error);
    } else {
      const { error } = await supabase
        .from('promo_discounts')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', req.params.id);
      if (error) return next(error);
    }

    logger.info('admin — coupon deleted', { id: req.params.id, hard: req.query.hard === 'true', adminId: req.user.userId });
    return res.status(204).send();
  } catch (err) { return next(err); }
});

// ── PATCH /coupons/:id/toggle ─────────────────────────────────────────────────
// Quick toggle for the list page switch
router.patch('/:id/toggle', async (req, res, next) => {
  try {
    const { data: current } = await supabase
      .from('promo_discounts').select('is_active').eq('id', req.params.id).single();

    const { data: row, error } = await supabase
      .from('promo_discounts')
      .update({ is_active: !current?.is_active, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select('id, code, is_active')
      .single();

    if (error) return next(error);
    return res.json({ coupon: row });
  } catch (err) { return next(err); }
});

module.exports = router;
