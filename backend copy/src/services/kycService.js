'use strict';

const crypto  = require('crypto');
const axios   = require('axios');
const supabase = require('../config/supabase');
const fcmService = require('./fcmService');
const logger  = require('../utils/logger');

// Base host switches between production and preproduction automatically
const SIGNZY_HOST     = process.env.NODE_ENV === 'production'
  ? 'https://api.signzy.app'
  : 'https://api-preproduction.signzy.app';
const SIGNZY_STUDIO   = 'https://api.signzy.app/api/v3/studio'; // Studio is always prod

const SIGNZY = {
  BASE_URL:              SIGNZY_STUDIO,
  DL_URL:                `${SIGNZY_HOST}/api/v3/dl_/verification`,
  CKYC_SEARCH_URL:       `${SIGNZY_HOST}/api/v3/ckyc-onprem/search`,
  CKYC_FETCH_URL:        `${SIGNZY_HOST}/api/v3/ckyc/fetch-analyze`,
  EAADHAAR_DIRECT_URL:   `${SIGNZY_HOST}/api/v3/digilocker-v2/geteAadhaar`,
  DETAILS_DIRECT_URL:    `${SIGNZY_HOST}/api/v3/digilocker-v2/getDetails`,
  CREATE_URL_DIRECT_URL: `${SIGNZY_HOST}/api/v3/digilocker-v2/create-url-with-matcher`,
  STUDIOS: {
    DIGILOCKER_CREATE_URL:   '69d533b68ed327378f709d1e',
    DIGILOCKER_GET_DETAILS:  '69d533da937ed0dd49584cb5',
    DIGILOCKER_GET_EAADHAAR: '69d533f9c95a90c4c959ef04',
    // CKYC_SEARCH (Studio 69d53428...) no longer used — real endpoint above
    // CKYC_FETCH_ANALYZE (Studio 69d53450...) no longer used — real endpoint above
  },
};

// CKYC image codes (per Signzy spec)
const CKYC_IMAGE_CODE = {
  PHOTOGRAPH: '02',
  PAN:        '03',
  AADHAAR:    '04',
  PASSPORT:   '05',
  DL:         '06',
  VOTER_ID:   '07',
};

// ── Shared request helper ─────────────────────────────────────────────────────
async function signzyPost(studioId, workflowName, body) {
  const url = `${SIGNZY.BASE_URL}/${studioId}/${workflowName}`;
  const response = await axios.post(url, body, {
    headers: {
      Authorization: process.env.SIGNZY_API_KEY,
      'Content-Type': 'application/json',
    },
    timeout: 20000,
  });
  return response.data;
}

// ── Convert S3 URL → base64 (Signzy v3 requires base64 instead of URLs) ───────
async function urlToBase64(s3Url) {
  if (!s3Url) return null;
  try {
    const resp = await axios.get(s3Url, { responseType: 'arraybuffer', timeout: 15000 });
    const mime = resp.headers['content-type'] || 'image/jpeg';
    return `data:${mime};base64,${Buffer.from(resp.data).toString('base64')}`;
  } catch (err) {
    logger.warn('kycService.urlToBase64 — could not fetch S3 URL', { url: s3Url, error: err.message });
    return null;
  }
}

// ── Step 1 (legacy/Studio): DigiLocker — Create consent URL ──────────────────
// Kept for backwards compatibility — use createDigilockerUrlDirect() for new flows.
async function createDigilockerUrl(driverPhone, driverName, redirectUrl) {
  const data = await signzyPost(
    SIGNZY.STUDIOS.DIGILOCKER_CREATE_URL,
    'digilocker-create-url-with-matcher',
    {
      mobile:      driverPhone,
      name:        driverName,
      redirectUrl: redirectUrl || `${process.env.BACKEND_URL}/webhooks/signzy/digilocker-callback`,
    }
  );
  logger.info('kycService.createDigilockerUrl (Studio) — created', { phone: driverPhone });
  return data;   // { url, requestId, ... }
}

// ── Step 1b: DigiLocker — Create consent URL (v2 Direct API with match scores) ─
// Endpoint: POST /api/v3/digilocker-v2/create-url-with-matcher
//
// Returns: { url, requestId }
//
// Match scores are POSTed asynchronously to `callbackUrl` by Signzy after consent:
//   { event, requestId, status, nameMatchScore, dobMatch, faceMatchScore, pincodeMatch }
//
// Parameters:
//   callbackUrl          — MANDATORY: where Signzy POSTs match scores after consent
//   name                 — driver's name for name-match scoring
//   dob                  — dd/mm/yyyy for DOB-match scoring
//   selfieImage          — URL or base64 selfie for face-match scoring
//   pincode              — 6-digit pincode for pincode-match scoring
//   successRedirectUrl   — where DigiLocker iframe redirects on success
//   failureRedirectUrl   — where DigiLocker iframe redirects on failure
//   successRedirectTime  — redirect delay seconds (default: 10)
//   failureRedirectTime  — redirect delay seconds (default: 10)
//   signup               — true to allow new DigiLocker registrations
//   purpose              — 'kyc'|'verification'|'compliance'|'availing_services'|'educational'
//   internalId           — arbitrary tracking ID (we use driverId)
//   getScope             — push scope info to callbackUrl
//   pinlessAuthentication — PIN-free login on DigiLocker mobile (Wayne domain only)
async function createDigilockerUrlDirect({
  name,
  dob,
  selfieImage,
  pincode,
  callbackUrl,
  successRedirectUrl,
  failureRedirectUrl,
  successRedirectTime,
  failureRedirectTime,
  signup            = true,
  purpose           = 'kyc',
  getScope          = false,
  logoVisible,
  logo,
  internalId,
  pinlessAuthentication,
} = {}) {
  if (!callbackUrl) throw new Error('callbackUrl is required for createDigilockerUrlDirect');

  const body = {
    signup,
    callbackUrl,
    purpose,
    ...(name                 && { name }),
    ...(dob                  && { dob }),
    ...(selfieImage          && { selfieImage }),
    ...(pincode              && { pincode }),
    ...(successRedirectUrl   && { successRedirectUrl }),
    ...(failureRedirectUrl   && { failureRedirectUrl }),
    ...(successRedirectTime  && { successRedirectTime }),
    ...(failureRedirectTime  && { failureRedirectTime }),
    ...(getScope             && { getScope }),
    ...(logoVisible          && { logoVisible }),
    ...(logo                 && { logo }),
    ...(internalId           && { internalId }),
    ...(pinlessAuthentication && { pinlessAuthentication }),
  };

  const response = await axios.post(SIGNZY.CREATE_URL_DIRECT_URL, body, {
    headers: {
      Authorization:  process.env.SIGNZY_API_KEY,
      'Content-Type': 'application/json',
    },
    timeout: 20000,
  });

  logger.info('kycService.createDigilockerUrlDirect — created', {
    internalId,
    hasName: !!name, hasDob: !!dob, hasSelfie: !!selfieImage, hasPincode: !!pincode,
  });

  // Normalise: API returns { result: { url, requestId } } — flatten for convenience
  const result = response.data?.result ?? response.data;
  return { url: result.url, requestId: result.requestId, raw: response.data };
}

// ── Step 2: DigiLocker — Get profile details ──────────────────────────────────
async function getDigilockerDetails(requestId) {
  const data = await signzyPost(
    SIGNZY.STUDIOS.DIGILOCKER_GET_DETAILS,
    'digilocker2-get-details',
    { requestId }
  );
  logger.info('kycService.getDigilockerDetails — fetched', { requestId });
  return data;
}

// ── Step 3a: DigiLocker — Pull eAadhaar via Studio (legacy/simple) ───────────
async function getDigilockerEAadhaar(requestId) {
  const data = await signzyPost(
    SIGNZY.STUDIOS.DIGILOCKER_GET_EAADHAAR,
    'digilocker2-get-eaadhaar',
    { requestId }
  );
  logger.info('kycService.getDigilockerEAadhaar — fetched', { requestId });
  return data;
}

// ── Step 3b: DigiLocker — Pull eAadhaar via v2 Direct API ────────────────────
// Richer response: DSC (x509Data), split address, JPEG/PDF links, signature data.
// Options:
//   extraDigitalCertificateParams — include X.509 DSC + signatureData
//   getBase64Files                — return base64-encoded file content instead of persist URLs
//   getEAadhaarPdf                — include Aadhaar PDF (URL or base64)
//   getEAadhaarJpeg               — include Aadhaar JPEG (URL or base64)
async function getEAadhaarDirect(requestId, {
  extraDigitalCertificateParams = true,
  getBase64Files = false,
  getEAadhaarPdf = false,
  getEAadhaarJpeg = false,
} = {}) {
  const body = {
    requestId,
    extraDigitalCertificateParams,
    ...(getBase64Files  && { getBase64Files }),
    ...(getEAadhaarPdf  && { getEAadhaarPdf }),
    ...(getEAadhaarJpeg && { getEAadhaarJpeg }),
  };

  const response = await axios.post(SIGNZY.EAADHAAR_DIRECT_URL, body, {
    headers: {
      Authorization:  process.env.SIGNZY_API_KEY,
      'Content-Type': 'application/json',
    },
    timeout: 25000,
  });

  logger.info('kycService.getEAadhaarDirect — fetched', {
    requestId,
    validDSC: response.data?.result?.x509Data?.validAadhaarDSC,
  });

  return response.data;
  // Shape: { result: { name, uid, dob, gender, address, photo, splitAddress,
  //   x509Data, signatureData?, aadhaarJpeg?, aadhaarPdf? } }
}

// ── Step 2b: DigiLocker — Get all linked document details (v2 Direct API) ─────
// Endpoint: POST /api/v3/digilocker-v2/getDetails
//
// Returns:
//   result.userDetails  — { digilockerid, name, dob, gender, eaadhaar, mobile }
//   result.files        — Array of issued documents:
//     { name, type, doctype, description, issuerid, issuer, id, mime, date, size }
//
// The `id` field encodes the full document reference:
//   e.g.  "in.gov.transport-DRVLC-DL1234567890123"
//         "in.gov.cbdt-PANCR-ABCDE1234F"
//         "in.gov.uidai-AADHAAR-<masked>"
//
// Useful for:
//   - Pre-flighting which documents the driver has linked (DL, PAN, Aadhaar)
//   - Populating a document checklist before running CKYC fetch
//   - Extracting DL number / PAN number programmatically
async function getDetailsDirect(requestId) {
  const response = await axios.post(SIGNZY.DETAILS_DIRECT_URL, { requestId }, {
    headers: {
      Authorization:  process.env.SIGNZY_API_KEY,
      'Content-Type': 'application/json',
    },
    timeout: 20000,
  });

  logger.info('kycService.getDetailsDirect — fetched', {
    requestId,
    fileCount: response.data?.result?.files?.length ?? 0,
    hasEadhaar: response.data?.result?.userDetails?.eaadhaar,
  });

  return response.data;
  // Shape: {
  //   result: {
  //     userDetails: { digilockerid, name, dob, gender, eaadhaar, mobile },
  //     files: [ { name, type, size, date, mime, doctype, description,
  //                issuerid, issuer, id } ]
  //   }
  // }
}

// ── Step 4: CKYC Search ───────────────────────────────────────────────────────
// Endpoint: POST /api/v3/ckyc-onprem/search  (direct — NOT Studio)
//
// idType values for drivers:
//   'P'  — PAN number            (preferred primary)
//   'D'  — Driving License number
//   'M'  — 10-digit mobile number
//   'A'  — Aadhaar (last4|First|Last|DOB DD-MM-YYYY|Gender)
//
// additionalOVDs: fallback IDs tried if primary returns no records.
async function ckycSearch({ pan, dlNumber, mobile }) {
  // Build primary ID — prefer PAN, fall back to DL
  let idNumber, idType;
  if (pan) {
    idNumber = pan;
    idType   = 'P';
  } else if (dlNumber) {
    idNumber = dlNumber;
    idType   = 'D';
  } else if (mobile) {
    idNumber = mobile.replace(/^\+91/, '').replace(/\D/g, '').slice(-10);
    idType   = 'M';
  } else {
    throw new Error('ckycSearch: at least one of pan / dlNumber / mobile is required');
  }

  // Build additionalOVDs for fallback (only include if we have them and they aren't the primary)
  const additionalOVDs = [];
  if (idType !== 'D' && dlNumber)  additionalOVDs.push({ idNumber: dlNumber, idType: 'D' });
  if (idType !== 'M' && mobile) {
    const mob = mobile.replace(/^\+91/, '').replace(/\D/g, '').slice(-10);
    additionalOVDs.push({ idNumber: mob, idType: 'M' });
  }

  const body = {
    idNumber,
    idType,
    // Omit 'env' in production — only pass 'preproduction' for CERSAI Sandbox
    ...(process.env.NODE_ENV !== 'production' && { env: 'preproduction' }),
    ...(additionalOVDs.length && { additionalOVDs }),
  };

  const response = await axios.post(SIGNZY.CKYC_SEARCH_URL, body, {
    headers: {
      Authorization:  process.env.SIGNZY_API_KEY,
      'Content-Type': 'application/json',
    },
    timeout: 20000,
  });

  logger.info('kycService.ckycSearch — done', {
    idType,
    ckycNumber: response.data?.result?.ckycNumber,
  });
  // result may be an object or an array (when PAN has both Individual + Sole Prop)
  return response.data;  // { result: { ckycNumber, referenceId, fullName, ... }, additionalResults }
}

// ── Step 5: CKYC Fetch + Analyze ──────────────────────────────────────────────
// Endpoint: POST /api/v3/ckyc/fetch-analyze  (direct — NOT Studio)
// authFactorType 01 = DOB authentication in DD-MM-YYYY format
// imageDetails: uploaded driver docs as raw base64, each tagged with CKYC image code
async function ckycFetchAndAnalyze({
  ckycNumber,
  dobISO,          // YYYY-MM-DD stored in DB
  firstName,
  middleName = '',
  lastName,
  fullName,
  pan,
  imageDetails,    // [{ sequenceNo, imageType, imageCode, globalFlag, branchCode, imageData }]
}) {
  // authFactorValue for type 01 must be DD-MM-YYYY
  const [y, m, d] = (dobISO || '').split('-');
  const authFactorValue = dobISO ? `${d}-${m}-${y}` : '';
  const dobSlash        = dobISO ? `${d}/${m}/${y}` : '';

  const body = {
    ckycNumber,
    authFactorType:  '01',         // Date of Birth
    authFactorValue,               // DD-MM-YYYY
    firstName:   firstName  || '',
    middleName:  middleName || '',
    lastName:    lastName   || '',
    fullName:    fullName   || '',
    dob:         dobSlash,         // DD/MM/YYYY for analysis fields
    pan:         pan        || '',
    imageDetails: imageDetails || [],
  };

  const response = await axios.post(SIGNZY.CKYC_FETCH_URL, body, {
    headers: {
      Authorization:  process.env.SIGNZY_API_KEY,
      'Content-Type': 'application/json',
    },
    timeout: 30000,
  });

  logger.info('kycService.ckycFetchAndAnalyze — done', {
    ckycNumber,
    finalVerdict: response.data?.finalVerdict,
  });
  return response.data;  // { status, requestId, finalVerdict, actionables, analysisResult }
}

// ── Step 6: Driving Licence Verification ─────────────────────────────────────
// Endpoint: POST /api/v3/dl_/verification
// Body:     { number, dob, issueDate? }  — all dates DD/MM/YYYY
//
// Accepts dob / issueDate in either format:
//   YYYY-MM-DD  (ISO, from DB)
//   DD/MM/YYYY  (Signzy format, from Aadhaar / manual input)
//
// Returns: { result: { verified, message, moreInfo: { issueDate, expiryDate, vehicleClass[] } } }
async function verifyDrivingLicence(dlNumber, dob, issueDate) {
  // Normalise to DD/MM/YYYY regardless of input format
  const toSignzyDate = (val) => {
    if (!val) return undefined;
    val = String(val).trim();
    // Already DD/MM/YYYY
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(val)) return val;
    // ISO YYYY-MM-DD → DD/MM/YYYY
    if (/^\d{4}-\d{2}-\d{2}/.test(val)) {
      const [y, m, d] = val.split('T')[0].split('-');
      return `${d}/${m}/${y}`;
    }
    return val; // pass through unknown formats and let Signzy reject
  };

  if (!dlNumber) throw Object.assign(new Error('DL number is required'), { code: 'MISSING_DL_NUMBER', status: 422 });
  if (!dob)      throw Object.assign(new Error('Date of birth is required for DL verification'), { code: 'MISSING_DOB', status: 422 });

  const body = {
    number: dlNumber.trim().toUpperCase(),
    dob:    toSignzyDate(dob),
  };
  const issueDateFmt = toSignzyDate(issueDate);
  if (issueDateFmt) body.issueDate = issueDateFmt;

  const response = await axios.post(SIGNZY.DL_URL, body, {
    headers: {
      Authorization:  process.env.SIGNZY_API_KEY,
      'Content-Type': 'application/json',
    },
    timeout: 20000,
  });

  logger.info('kycService.verifyDrivingLicence — done', {
    dlNumber,
    verified: response.data?.result?.verified,
    vehicleClass: response.data?.result?.moreInfo?.vehicleClass,
  });
  return response.data;
  // Shape: { result: { verified, message, moreInfo: { issueDate, expiryDate, vehicleClass[] } } }
}

// ── Persist DL verification result to the drivers table ──────────────────────
// Called by submitKYC and the standalone /drivers/dl/verify route.
// Non-fatal: errors are logged and re-thrown only when called from standalone route.
async function persistDLVerification(driverId, dlResult) {
  const r = dlResult?.result ?? {};
  const updates = {
    driving_licence_verified_at: new Date().toISOString(),
  };

  if (r.verified === true) {
    updates.driving_licence_status = 'verified';
    const mi = r.moreInfo ?? {};
    // expiryDate from Signzy: "Oct 22, 2041" — parse to ISO for DB storage
    if (mi.expiryDate) {
      const parsed = new Date(mi.expiryDate);
      if (!isNaN(parsed)) updates.driving_licence_expiry = parsed.toISOString().split('T')[0];
    }
    // issueDate from Signzy: "Oct 25, 2021"
    if (mi.issueDate) {
      const parsed = new Date(mi.issueDate);
      if (!isNaN(parsed)) updates.driving_licence_issued_at = parsed.toISOString().split('T')[0];
    }
    // vehicle classes as JSON array
    if (Array.isArray(mi.vehicleClass) && mi.vehicleClass.length) {
      updates.dl_vehicle_class = JSON.stringify(mi.vehicleClass);
    }
  } else {
    updates.driving_licence_status = 'rejected';
  }

  const { error } = await supabase.from('drivers').update(updates).eq('id', driverId);
  if (error) logger.warn('kycService.persistDLVerification — DB persist failed', { driverId, error: error.message });
  return updates;
}



// ──────────────────────────────────────────────────────────────────────────────
// submitKYC — Main entry point called after multer-s3 uploads all driver docs.
//
// Full flow:
//   1. Save S3 URLs to DB, mark kyc_status = 'pending'
//   2. Convert S3 files → base64 (v3 API requirement)
//   3. CKYC Search   (by name + DOB from driver profile)
//   4. CKYC Fetch+Analyze (if CKYC number found)
//   5. DL Verification
//   6. Store Signzy request tracking IDs
// ──────────────────────────────────────────────────────────────────────────────
async function submitKYC(driverId, files) {
  const getUrl = (field) => files?.[field]?.[0]?.location || null;

  const docUrls = {
    dl_url:            getUrl('dl'),
    rc_url:            getUrl('rc'),
    insurance_url:     getUrl('insurance'),
    aadhaar_url:       getUrl('aadhaar'),
    profile_photo_url: getUrl('profile_photo'),
  };

  // ── 1. Save S3 URLs, mark KYC pending ──────────────────────────────────────
  const { error: updateErr } = await supabase
    .from('drivers')
    .update({ ...docUrls, kyc_status: 'pending' })
    .eq('id', driverId);

  if (updateErr) {
    logger.error('kycService.submitKYC — DB update error', { error: updateErr });
    throw Object.assign(new Error('Failed to save KYC documents'), { code: 'DB_ERROR', status: 500 });
  }

  // Fetch driver profile for KYC fields
  const { data: driverRows } = await supabase
    .from('drivers')
    .select('name, phone, dob, dl_number, dl_number_from_digilocker, dl_issue_date, pan')
    .eq('id', driverId)
    .limit(1);
  const driver = driverRows?.[0] ?? {};

  // ── 2. Convert doc S3 URLs to base64 for CKYC imageDetails ─────────────────
  const [aadhaarBase64, dlBase64, photoBase64] = await Promise.all([
    urlToBase64(docUrls.aadhaar_url),
    urlToBase64(docUrls.dl_url),
    urlToBase64(docUrls.profile_photo_url),
  ]);

  // Build the imageDetails array for CKYC Fetch+Analyze
  // Each entry maps a driver document to its CKYC image code
  const imageDetails = [];
  let seq = 1;
  const pushImage = (base64, imageCode) => {
    if (!base64) return;
    // Extract MIME type and raw base64 data
    const match = base64.match(/^data:([^;]+);base64,(.+)$/);
    const imageType = match ? match[1].split('/')[1] : 'jpg';
    const imageData = match ? match[2] : base64;
    imageDetails.push({
      sequenceNo: String(seq++),
      imageType,
      imageCode,
      globalFlag:  '1',
      branchCode:  '101',
      imageData,   // raw base64 without the data:... prefix
    });
  };

  pushImage(photoBase64,   CKYC_IMAGE_CODE.PHOTOGRAPH);
  pushImage(aadhaarBase64, CKYC_IMAGE_CODE.AADHAAR);
  pushImage(dlBase64,      CKYC_IMAGE_CODE.DL);

  // Parse driver name into parts for CKYC API
  const nameParts  = (driver.name || '').trim().split(/\s+/);
  const firstName  = nameParts[0] || '';
  const lastName   = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';
  const middleName = nameParts.length > 2 ? nameParts.slice(1, -1).join(' ') : '';

  // ── 3–6. Run Signzy v3 Studio pipeline (non-fatal — docs already saved) ───
  const signzyMeta = {};
  try {
    // CKYC Search — primary by PAN, fallback by DL number and mobile
    const ckycSearchRes = await ckycSearch({
      pan:      driver.pan,
      dlNumber: driver.dl_number,
      mobile:   driver.phone,
    }).catch((err) => {
      logger.warn('kycService.submitKYC — CKYC search failed', { error: err.message });
      return null;
    });

    signzyMeta.ckyc_search = ckycSearchRes;

    // result may be array (dual PAN) — take the individual account (no constitutionType)
    const resultEntry = Array.isArray(ckycSearchRes?.result)
      ? ckycSearchRes.result.find((r) => !r.constitutionType) ?? ckycSearchRes.result[0]
      : ckycSearchRes?.result;
    const ckycNumber = resultEntry?.ckycNumber;

    // CKYC Fetch + Analyze (only if CKYC number found)
    if (ckycNumber) {
      const ckycFetchRes = await ckycFetchAndAnalyze({
        ckycNumber,
        dobISO:     driver.dob,
        firstName,
        middleName,
        lastName,
        fullName:   driver.name,
        pan:        driver.pan,
        imageDetails,
      }).catch((err) => {
        logger.warn('kycService.submitKYC — CKYC fetch failed', { error: err.message });
        return null;
      });
      signzyMeta.ckyc_fetch = ckycFetchRes;
    }

    // DL Verification — only needs DL number + DOB (no base64)
    // Falls back to dl_number_from_digilocker if dl_number is not set.
    const dlNum = driver.dl_number || driver.dl_number_from_digilocker;
    if (dlNum && driver.dob) {
      const dlRes = await verifyDrivingLicence(
        dlNum,
        driver.dob,          // YYYY-MM-DD from DB — auto-converted inside
        driver.dl_issue_date // optional, YYYY-MM-DD
      ).catch((err) => {
        logger.warn('kycService.submitKYC — DL verification failed', { error: err.message });
        return null;
      });
      signzyMeta.dl_verification = dlRes;
      // Persist result to DB immediately (non-fatal)
      if (dlRes) {
        await persistDLVerification(driverId, dlRes).catch((err) => {
          logger.warn('kycService.submitKYC — DL persist failed', { error: err.message });
        });
      }
    }

    // Store a tracking reference
    const signzyRequestId = ckycSearchRes?.requestId || ckycSearchRes?.id || `sakhi-${driverId}-${Date.now()}`;
    await supabase.from('drivers').update({ signzy_request_id: signzyRequestId }).eq('id', driverId);
    signzyMeta.request_id = signzyRequestId;

  } catch (err) {
    logger.error('kycService.submitKYC — Signzy pipeline error', { error: err?.response?.data || err.message });
    // Non-fatal — docs are saved, pipeline can be retried via admin
  }

  logger.info('kycService.submitKYC — submitted', { driverId, signzyMeta });
  return { kyc_status: 'pending', signzy_meta: signzyMeta };
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
// handleSignzyWebhook — called from POST /webhooks/signzy
// Signzy calls this when async verification completes.
// ──────────────────────────────────────────────────────────────────────────────
async function handleSignzyWebhook(payload, io) {
  const signzyRequestId = payload.request_id || payload.requestId || payload.id;
  const result = payload.result || payload.status; // 'approved' | 'flagged' | 'rejected'

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
    const updates = { kyc_status: 'verified' };
    if (driver.gender_verified) {
      updates.verification_status = 'approved';
      updates.is_active = true;
    }
    await supabase.from('drivers').update(updates).eq('id', driverId);

    if (driver.gender_verified) {
      await fcmService.sendToUser(driverId, 'driver', {
        title: 'KYC Approved ✅',
        body:  'Your KYC verification was successful. You can now start accepting rides!',
        data:  { type: 'KYC_APPROVED' },
      });
    }
  } else if (result === 'flagged' || result === 'manual_review') {
    await supabase.from('drivers').update({ kyc_status: 'manual_review' }).eq('id', driverId);

    if (io) {
      const emitter = require('../socket/emitter');
      emitter.emitToAdminRoom(io, 'kyc:manual_review', {
        driver_id:          driverId,
        driver_name:        driver.name,
        signzy_request_id:  signzyRequestId,
      });
    }
  } else {
    await supabase.from('drivers').update({ kyc_status: 'rejected' }).eq('id', driverId);

    await fcmService.sendToUser(driverId, 'driver', {
      title: 'KYC Rejected',
      body:  'Some documents were rejected. Please re-upload your KYC documents.',
      data:  { type: 'KYC_REJECTED' },
    });
  }

  logger.info('kycService.handleSignzyWebhook — processed', { driverId, result });
}

// ──────────────────────────────────────────────────────────────────────────────
// DigiLocker flow — exposed for the driver onboarding controller if needed
// ──────────────────────────────────────────────────────────────────────────────
module.exports = {
  submitKYC,
  resubmitKYC,
  handleSignzyWebhook,
  // DigiLocker flow — step-by-step onboarding
  createDigilockerUrl,        // Studio-based (legacy, simple)
  createDigilockerUrlDirect,  // Direct v2 API (match scores: name, DOB, face, pincode)
  getDigilockerDetails,       // Studio-based (simple profile details)
  getDetailsDirect,           // Direct v2 API (user profile + full document inventory)
  getDigilockerEAadhaar,      // Studio-based (simple)
  getEAadhaarDirect,          // Direct v2 API (richer: DSC, split address, JPEG/PDF)
  // Individual verifications (useful for admin retry)
  ckycSearch,
  ckycFetchAndAnalyze,
  verifyDrivingLicence,
  persistDLVerification,
};
