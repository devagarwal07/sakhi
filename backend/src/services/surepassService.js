'use strict';

/**
 * surepassService.js
 *
 * Unified Surepass API wrapper. All Surepass products share the same
 * SUREPASS_TOKEN JWT.  Note the two different domains:
 *
 *   RC V2           → sandbox.surepass.app  /  kyc-api.surepass.app
 *   Driving Licence → sandbox.surepass.io   /  kyc-api.surepass.io
 *
 * Env vars required:
 *   SUREPASS_TOKEN  — JWT Bearer token (rotate periodically)
 *   NODE_ENV        — 'production' → live endpoints, else sandbox
 */

const axios    = require('axios');
const supabase = require('../config/supabase');
const logger   = require('../utils/logger');

// ── Base URLs (two different domains for different Surepass products) ─────────
const isProd = process.env.NODE_ENV === 'production';

const RC_BASE_URL = isProd
  ? 'https://kyc-api.surepass.app'
  : 'https://sandbox.surepass.app';

const DL_BASE_URL = isProd
  ? 'https://kyc-api.surepass.io'
  : 'https://sandbox.surepass.io';

const RC_V2_URL = `${RC_BASE_URL}/api/v1/rc/rc-v2`;
const DL_URL    = `${DL_BASE_URL}/api/v1/driving-license/driving-license`;

// ── Shared auth header ────────────────────────────────────────────────────────
function surepassAuthHeader() {
  const token = process.env.SUREPASS_TOKEN;
  if (!token) throw Object.assign(
    new Error('SUREPASS_TOKEN is not configured'),
    { code: 'SUREPASS_NOT_CONFIGURED', status: 500 }
  );
  return `Bearer ${token}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// verifyRC
//
// Calls the Surepass RC V2 API for a given vehicle registration number.
//
// Parameters:
//   rcNumber  {string}  — Vehicle registration number, e.g. "DL08AB1234"
//   enrich    {boolean} — true → enriched mode (owner + chassis unmasked) [default: false]
//
// Returns full Surepass response:
//   { data: { rc_number, owner_name, vehicle_chasi_number, fuel_type,
//             insurance_upto, fit_up_to, response_metadata, ... },
//     status_code, success, message, message_code }
// ─────────────────────────────────────────────────────────────────────────────
async function verifyRC(rcNumber, enrich = false) {
  if (!rcNumber || typeof rcNumber !== 'string' || !rcNumber.trim()) {
    throw Object.assign(
      new Error('Vehicle registration number (RC number) is required'),
      { code: 'MISSING_RC_NUMBER', status: 422 }
    );
  }

  const body = {
    id_number: rcNumber.trim().toUpperCase(),
    enrich:    !!enrich,
  };

  const response = await axios.post(RC_V2_URL, body, {
    headers: {
      'Content-Type': 'application/json',
      Authorization:  surepassAuthHeader(),
    },
    timeout: 20000,
  });

  const payload = response.data;

  logger.info('surepassService.verifyRC — done', {
    rcNumber:      body.id_number,
    enrich,
    success:       payload?.success,
    messageCode:   payload?.message_code,
    maskedOwner:   payload?.data?.response_metadata?.masked_owner_name,
    maskedChassis: payload?.data?.response_metadata?.masked_chassis,
  });

  return payload;
}

// ─────────────────────────────────────────────────────────────────────────────
// persistRCVerification
//
// Persists key RC fields to the drivers table.
// Safe to call with null/failed payload — gracefully marks as rejected.
//
// Columns written (require migration 20260411_driver_rc_verification.sql):
//   rc_verified_at, rc_status, rc_owner_name, rc_chassis_number,
//   rc_fuel_type, rc_maker_model, rc_insurance_upto, rc_fit_upto,
//   rc_registration_date, rc_financed, rc_blacklist_status, rc_raw_response
// ─────────────────────────────────────────────────────────────────────────────
async function persistRCVerification(driverId, rcPayload) {
  const updates = { rc_verified_at: new Date().toISOString() };

  if (!rcPayload?.success || !rcPayload?.data) {
    updates.rc_status = 'rejected';
    const { error } = await supabase.from('drivers').update(updates).eq('id', driverId);
    if (error) logger.warn('surepassService.persistRCVerification — rejected persist failed', { driverId, error: error.message });
    return updates;
  }

  const d = rcPayload.data;

  const blacklisted   = d.blacklist_status && d.blacklist_status.trim() !== '';
  updates.rc_status   = blacklisted ? 'blacklisted' : 'verified';

  if (d.owner_name)             updates.rc_owner_name       = d.owner_name;
  if (d.vehicle_chasi_number)   updates.rc_chassis_number   = d.vehicle_chasi_number;
  if (d.fuel_type)              updates.rc_fuel_type        = d.fuel_type;
  if (d.maker_model)            updates.rc_maker_model      = d.maker_model;
  if (d.financed !== undefined) updates.rc_financed         = Boolean(d.financed);
  if (d.blacklist_status)       updates.rc_blacklist_status = d.blacklist_status;

  const parseDate = (val) => {
    if (!val) return null;
    const p = new Date(val);
    return isNaN(p) ? null : p.toISOString().split('T')[0];
  };
  const ins = parseDate(d.insurance_upto);
  const fit = parseDate(d.fit_up_to);
  const reg = parseDate(d.registration_date);
  if (ins) updates.rc_insurance_upto    = ins;
  if (fit) updates.rc_fit_upto          = fit;
  if (reg) updates.rc_registration_date = reg;

  updates.rc_raw_response = rcPayload;

  const { error } = await supabase.from('drivers').update(updates).eq('id', driverId);
  if (error) {
    logger.warn('surepassService.persistRCVerification — DB persist failed', { driverId, error: error.message });
  } else {
    logger.info('surepassService.persistRCVerification — persisted', { driverId, rc_status: updates.rc_status });
  }
  return updates;
}

// ─────────────────────────────────────────────────────────────────────────────
// verifyDL
//
// Calls the Surepass Driving Licence Verification API.
//
// Parameters:
//   dlNumber   {string}  — DL number, e.g. "UP20 20150000000"
//   fullName   {string?} — License holder name for cross-validation (optional)
//   dob        {string?} — Date of birth YYYY-MM-DD (optional but recommended)
//
// Returns full Surepass response:
//   { data: { license_number, name, dob, doe, doi, gender, vehicle_classes[],
//             state, ola_name, ola_code, blood_group, has_image, less_info,
//             permanent_address, temporary_address, father_or_husband_name,
//             citizenship, transport_doe, transport_doi }, ... }
// ─────────────────────────────────────────────────────────────────────────────
async function verifyDL(dlNumber, { fullName, dob } = {}) {
  if (!dlNumber || typeof dlNumber !== 'string' || !dlNumber.trim()) {
    throw Object.assign(
      new Error('Driving licence number is required'),
      { code: 'MISSING_DL_NUMBER', status: 422 }
    );
  }

  const body = {
    id_number: dlNumber.trim().toUpperCase(),
    ...(fullName || dob
      ? {
          additional_details: {
            ...(fullName && { full_name: fullName }),
            ...(dob      && { dob }),
          },
        }
      : {}),
  };

  const response = await axios.post(DL_URL, body, {
    headers: {
      'Content-Type': 'application/json',
      Authorization:  surepassAuthHeader(),
    },
    timeout: 20000,
  });

  const payload = response.data;

  logger.info('surepassService.verifyDL — done', {
    dlNumber:      dlNumber.trim().toUpperCase(),
    success:       payload?.success,
    messageCode:   payload?.message_code,
    name:          payload?.data?.name,
    doe:           payload?.data?.doe,
    vehicleClass:  payload?.data?.vehicle_classes,
  });

  return payload;
}

// ─────────────────────────────────────────────────────────────────────────────
// persistDLVerification
//
// Persists Surepass DL result to the drivers table.
// Reuses existing DL columns where possible; adds new Surepass-specific ones.
// Safe to call with null/failed payload.
//
// Existing columns reused:
//   driving_licence_status, driving_licence_expiry, driving_licence_issued_at,
//   driving_licence_verified_at, dl_vehicle_class
//
// New columns (require migration 20260411_driver_dl_surepass.sql):
//   dl_surepass_name, dl_gender, dl_issuing_state, dl_ola_name, dl_ola_code,
//   dl_blood_group, dl_has_image, dl_raw_response
// ─────────────────────────────────────────────────────────────────────────────
async function persistDLVerification(driverId, dlPayload) {
  const updates = {
    driving_licence_verified_at: new Date().toISOString(),
  };

  if (!dlPayload?.success || !dlPayload?.data) {
    updates.driving_licence_status = 'rejected';
    const { error } = await supabase.from('drivers').update(updates).eq('id', driverId);
    if (error) logger.warn('surepassService.persistDLVerification — rejected persist failed', { driverId, error: error.message });
    return updates;
  }

  const d = dlPayload.data;

  // ── Core status ──────────────────────────────────────────────────────────
  // If doe (expiry) exists and is in the future → verified; else expired
  const parseDate = (val) => {
    if (!val) return null;
    const p = new Date(val);
    return isNaN(p) ? null : p;
  };

  const doeDate = parseDate(d.doe);
  if (!doeDate) {
    updates.driving_licence_status = 'verified'; // can't compute expiry, accept as verified
  } else {
    updates.driving_licence_status = doeDate > new Date() ? 'verified' : 'expired';
    updates.driving_licence_expiry = doeDate.toISOString().split('T')[0];
  }

  // doi → issued_at
  const doiDate = parseDate(d.doi);
  if (doiDate) updates.driving_licence_issued_at = doiDate.toISOString().split('T')[0];

  // vehicle_classes → JSON array string (reuses existing dl_vehicle_class column)
  if (Array.isArray(d.vehicle_classes) && d.vehicle_classes.length) {
    updates.dl_vehicle_class = JSON.stringify(d.vehicle_classes);
  }

  // ── Surepass-specific new columns ────────────────────────────────────────
  if (d.name)       updates.dl_surepass_name  = d.name;
  if (d.gender)     updates.dl_gender         = d.gender;
  if (d.state)      updates.dl_issuing_state  = d.state;
  if (d.ola_name)   updates.dl_ola_name       = d.ola_name;
  if (d.ola_code)   updates.dl_ola_code       = d.ola_code;
  if (d.blood_group) updates.dl_blood_group   = d.blood_group;
  if (d.has_image !== undefined) updates.dl_has_image = Boolean(d.has_image);

  // Full payload for audit trail
  updates.dl_raw_response = dlPayload;

  const { error } = await supabase.from('drivers').update(updates).eq('id', driverId);
  if (error) {
    logger.warn('surepassService.persistDLVerification — DB persist failed', { driverId, error: error.message });
  } else {
    logger.info('surepassService.persistDLVerification — persisted', {
      driverId,
      driving_licence_status: updates.driving_licence_status,
      doe: d.doe,
    });
  }

  return updates;
}

module.exports = {
  verifyRC,
  persistRCVerification,
  verifyDL,
  persistDLVerification,
};
