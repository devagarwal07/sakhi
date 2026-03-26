'use strict';

const crypto = require('crypto');
const axios = require('axios');
const supabase = require('../config/supabase');
const fcmService = require('./fcmService');
const logger = require('../utils/logger');

// ── Signzy API helper ─────────────────────────────────────────────────────────
async function createSignzyRequest(driverId, docUrls) {
  const patronId = process.env.SIGNZY_PATRON_ID || 'default';
  const endpoint = `https://signzy.app/api/v2/patrons/${patronId}/firebases`;

  const response = await axios.post(
    endpoint,
    {
      task: 'driverKYC',
      essentials: {
        driverId,
        dlUrl: docUrls.dl_url,
        rcUrl: docUrls.rc_url,
        insuranceUrl: docUrls.insurance_url,
        aadhaarUrl: docUrls.aadhaar_url,
        profileUrl: docUrls.profile_photo_url,
      },
    },
    {
      headers: {
        Authorization: process.env.SIGNZY_API_KEY,
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    }
  );

  return response.data?.id || response.data?.request_id || response.data?.requestId;
}

// ──────────────────────────────────────────────────────────────────────────────
// submitKYC — called after multer-s3 uploads all driver docs
// ──────────────────────────────────────────────────────────────────────────────
async function submitKYC(driverId, files) {
  const getUrl = (field) => files?.[field]?.[0]?.location || null;

  const docUrls = {
    dl_url: getUrl('dl'),
    rc_url: getUrl('rc'),
    insurance_url: getUrl('insurance'),
    aadhaar_url: getUrl('aadhaar'),
    profile_photo_url: getUrl('profile_photo'),
  };

  // 1 & 2 — Save S3 URLs + set kyc_status=pending
  const { error: updateErr } = await supabase
    .from('drivers')
    .update({ ...docUrls, kyc_status: 'pending' })
    .eq('id', driverId);

  if (updateErr) {
    logger.error('kycService.submitKYC — DB update error', { error: updateErr });
    throw Object.assign(new Error('Failed to save KYC documents'), { code: 'DB_ERROR', status: 500 });
  }

  // 3 — Submit to Signzy
  let signzyRequestId = null;
  try {
    signzyRequestId = await createSignzyRequest(driverId, docUrls);
    await supabase.from('drivers').update({ signzy_request_id: signzyRequestId }).eq('id', driverId);
  } catch (err) {
    logger.error('kycService.submitKYC — Signzy error', { error: err?.response?.data || err.message });
    // Don't fail the request — KYC docs saved, Signzy can be retried
  }

  logger.info('kycService.submitKYC — submitted', { driverId, signzyRequestId });
  return { kyc_status: 'pending', signzy_request_id: signzyRequestId };
}

// ──────────────────────────────────────────────────────────────────────────────
// resubmitKYC — only allowed if rejected or manual_review
// ──────────────────────────────────────────────────────────────────────────────
async function resubmitKYC(driverId, files) {
  const { data: rows } = await supabase
    .from('drivers')
    .select('kyc_status')
    .eq('id', driverId)
    .limit(1);

  const kyc_status = rows?.[0]?.kyc_status;
  if (!['rejected', 'manual_review'].includes(kyc_status)) {
    throw Object.assign(
      new Error('Re-upload is only allowed when KYC status is rejected or manual_review.'),
      { code: 'KYC_REUPLOAD_NOT_ALLOWED', status: 422 }
    );
  }

  return submitKYC(driverId, files);
}

// ──────────────────────────────────────────────────────────────────────────────
// handleSignzyWebhook — called from /webhooks/signzy
// ──────────────────────────────────────────────────────────────────────────────
async function handleSignzyWebhook(payload, io) {
  const signzyRequestId = payload.request_id || payload.requestId || payload.id;
  const result = payload.result || payload.status; // 'approved','flagged','rejected'

  if (!signzyRequestId) {
    logger.warn('kycService.handleSignzyWebhook — missing request_id', { payload });
    return;
  }

  // Find driver by signzy_request_id
  const { data: rows } = await supabase
    .from('drivers')
    .select('id, gender_verified, name')
    .eq('signzy_request_id', signzyRequestId)
    .limit(1);

  const driver = rows?.[0];
  if (!driver) {
    logger.warn('kycService.handleSignzyWebhook — driver not found', { signzyRequestId });
    return;
  }

  const driverId = driver.id;

  if (result === 'approved') {
    // All docs passed
    const updates = { kyc_status: 'verified' };

    if (driver.gender_verified) {
      updates.verification_status = 'approved';
      updates.is_active = true;
    }

    await supabase.from('drivers').update(updates).eq('id', driverId);

    if (driver.gender_verified) {
      await fcmService.sendToUser(driverId, 'driver', {
        title: 'KYC Approved ✅',
        body: 'Your KYC verification was successful. You can now start accepting rides!',
        data: { type: 'KYC_APPROVED' },
      });
    }
  } else if (result === 'flagged' || result === 'manual_review') {
    await supabase.from('drivers').update({ kyc_status: 'manual_review' }).eq('id', driverId);

    // Notify admin via socket
    if (io) {
      const emitter = require('../socket/emitter');
      emitter.emitToAdminRoom(io, 'kyc:manual_review', {
        driver_id: driverId,
        driver_name: driver.name,
        signzy_request_id: signzyRequestId,
      });
    }
  } else {
    // Hard fail
    await supabase.from('drivers').update({ kyc_status: 'rejected' }).eq('id', driverId);

    await fcmService.sendToUser(driverId, 'driver', {
      title: 'KYC Rejected',
      body: 'Some of your documents were rejected. Please re-upload your KYC documents.',
      data: { type: 'KYC_REJECTED' },
    });
  }

  logger.info('kycService.handleSignzyWebhook — processed', { driverId, result });
}

module.exports = { submitKYC, resubmitKYC, handleSignzyWebhook };
