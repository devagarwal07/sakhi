'use strict';

const axios  = require('axios');
const supabase = require('../config/supabase');
const logger   = require('../utils/logger');

/**
 * payoutService — wraps RazorpayX Payouts API
 *
 * Environment variables required:
 *   RAZORPAY_KEY_ID          — standard Razorpay key
 *   RAZORPAY_KEY_SECRET      — standard Razorpay secret
 *   RAZORPAYX_ACCOUNT_NUMBER — nodal current account number (from RazorpayX dashboard)
 *
 * RazorpayX docs: https://razorpay.com/docs/x/payouts/
 */

const RAX_BASE = 'https://api.razorpay.com/v1';

function razorpayAuth() {
  return {
    username: process.env.RAZORPAY_KEY_ID,
    password: process.env.RAZORPAY_KEY_SECRET,
  };
}

// ── Ensure a Fund Account exists for this driver ─────────────────────────────
/**
 * Creates a RazorpayX Fund Account for a driver (UPI or bank).
 * Idempotent: if `fund_account_id` already exists on the driver row, return it.
 *
 * @param {string} driverId
 * @param {{ name, upi_id?, bank_account_no?, bank_ifsc? }} driver
 * @returns {string} fund_account_id
 */
async function ensureFundAccount(driverId, driver) {
  // Already registered
  if (driver.fund_account_id) return driver.fund_account_id;

  // Prefer UPI; fallback to bank
  let accountDetails;
  if (driver.upi_id) {
    accountDetails = {
      account_type: 'vpa',
      vpa: { address: driver.upi_id },
    };
  } else if (driver.bank_account_no && driver.bank_ifsc) {
    accountDetails = {
      account_type: 'bank_account',
      bank_account: {
        name:           driver.name || 'Driver',
        ifsc:           driver.bank_ifsc,
        account_number: driver.bank_account_no,
      },
    };
  } else {
    throw new Error(`Driver ${driverId} has no UPI or bank account configured`);
  }

  // 1. Create / fetch contact
  const { data: contact } = await axios.post(
    `${RAX_BASE}/contacts`,
    {
      name:         driver.name || 'Sakhi Driver',
      type:         'vendor',
      reference_id: driverId,
    },
    { auth: razorpayAuth(), timeout: 12_000 }
  );

  // 2. Create fund account
  const { data: fa } = await axios.post(
    `${RAX_BASE}/fund_accounts`,
    { contact_id: contact.id, ...accountDetails },
    { auth: razorpayAuth(), timeout: 12_000 }
  );

  // 3. Persist fund_account_id on driver
  await supabase
    .from('drivers')
    .update({ fund_account_id: fa.id })
    .eq('id', driverId);

  return fa.id;
}

// ── Initiate a Payout ─────────────────────────────────────────────────────────
/**
 * Initiates a RazorpayX payout and logs it in `payout_transactions`.
 *
 * @param {object} opts
 * @param {string}  opts.driverId
 * @param {string}  [opts.rideId]
 * @param {number}  opts.amountInr  Amount in ₹ (will be converted to paise)
 * @param {'coupon_liability'|'weekly_incentive'|'loyalty_reward'} opts.type
 * @param {string}  [opts.narration]
 * @returns {object} payout_transaction record
 */
async function initiatePayout({ driverId, rideId = null, amountInr, type, narration }) {
  if (!amountInr || amountInr <= 0) {
    logger.warn('payoutService.initiatePayout — zero amount, skipping', { driverId, rideId });
    return null;
  }

  // 1. Fetch driver payout details
  const { data: driverRows } = await supabase
    .from('drivers')
    .select('id, name, upi_id, bank_account_no, bank_ifsc, fund_account_id')
    .eq('id', driverId)
    .limit(1);

  const driver = driverRows?.[0];
  if (!driver) throw new Error(`Driver ${driverId} not found for payout`);

  // 2. Insert payout_transaction in 'pending'
  const { data: txRows } = await supabase
    .from('payout_transactions')
    .insert({
      driver_id: driverId,
      ride_id:   rideId,
      amount:    amountInr,
      type,
      status:    'pending',
    })
    .select('id')
    .single();

  const txId = txRows?.id;

  // 3. Check if payout is configured at all
  const accountNumber = process.env.RAZORPAYX_ACCOUNT_NUMBER;
  if (!accountNumber) {
    logger.warn('payoutService — RAZORPAYX_ACCOUNT_NUMBER not configured; skipping live payout', { txId });
    await supabase.from('payout_transactions').update({ status: 'failed', failure_reason: 'RAZORPAYX_ACCOUNT_NUMBER not configured' }).eq('id', txId);
    return { id: txId, status: 'failed' };
  }

  let fundAccountId;
  try {
    fundAccountId = await ensureFundAccount(driverId, driver);
  } catch (err) {
    logger.error('payoutService — fund account setup failed', { driverId, error: err.message });
    await supabase.from('payout_transactions').update({ status: 'failed', failure_reason: err.message }).eq('id', txId);
    return { id: txId, status: 'failed' };
  }

  // 4. Mark as processing
  await supabase.from('payout_transactions').update({ status: 'processing' }).eq('id', txId);

  // 5. Call RazorpayX payout
  try {
    const { data: payout } = await axios.post(
      `${RAX_BASE}/payouts`,
      {
        account_number: accountNumber,
        fund_account_id: fundAccountId,
        amount:          Math.round(amountInr * 100), // paise
        currency:        'INR',
        mode:            driver.upi_id ? 'UPI' : 'NEFT',
        purpose:         'payout',
        queue_if_low_balance: true,
        narration:       narration || `Sakhi ${type}`,
        reference_id:    txId,
      },
      { auth: razorpayAuth(), timeout: 15_000 }
    );

    // 6. RazorpayX returns status: queued | processing | processed | cancelled | reversed
    const settled = payout.status === 'processed';
    await supabase.from('payout_transactions').update({
      status:             settled ? 'success' : 'processing',
      razorpay_payout_id: payout.id,
      utr:                payout.utr || null,
      settled_at:         settled ? new Date().toISOString() : null,
    }).eq('id', txId);

    // 7. If ride-related coupon payout, mark settled on ride
    if (type === 'coupon_liability' && rideId && settled) {
      await supabase.from('rides').update({ promo_liability_settled: true }).eq('id', rideId);
    }

    logger.info('payoutService.initiatePayout — success', { txId, driverId, amountInr, payoutId: payout.id, status: payout.status });
    return { id: txId, razorpay_payout_id: payout.id, status: payout.status };

  } catch (err) {
    const reason = err?.response?.data?.description || err.message;
    logger.error('payoutService.initiatePayout — payout API error', { txId, driverId, error: reason });

    await supabase.from('payout_transactions').update({
      status:         'failed',
      failure_reason: reason,
    }).eq('id', txId);

    return { id: txId, status: 'failed', failure_reason: reason };
  }
}

// ── Handle RazorpayX webhook (payout.processed / payout.failed) ──────────────
/**
 * Called from webhooksRoute when Razorpay sends payout status events.
 *
 * @param {{ payoutId, status, utr }} param0
 */
async function handlePayoutWebhook({ payoutId, status, utr }) {
  const { data: rows } = await supabase
    .from('payout_transactions')
    .select('id, driver_id, ride_id, type, amount')
    .eq('razorpay_payout_id', payoutId)
    .limit(1);

  const tx = rows?.[0];
  if (!tx) {
    logger.warn('payoutService.handlePayoutWebhook — unknown payout_id', { payoutId });
    return;
  }

  const newStatus = status === 'processed' ? 'success' : 'failed';
  await supabase.from('payout_transactions').update({
    status:     newStatus,
    utr:        utr || null,
    settled_at: newStatus === 'success' ? new Date().toISOString() : null,
  }).eq('id', tx.id);

  // Mark ride promo settled
  if (newStatus === 'success' && tx.type === 'coupon_liability' && tx.ride_id) {
    await supabase.from('rides').update({ promo_liability_settled: true }).eq('id', tx.ride_id);
  }

  logger.info('payoutService.handlePayoutWebhook', { payoutId, newStatus, txId: tx.id });
}

module.exports = { initiatePayout, handlePayoutWebhook };
