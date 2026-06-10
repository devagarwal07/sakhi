'use strict';

const { Router }   = require('express');
const multer       = require('multer');
const authMiddleware = require('../middleware/authMiddleware');
const roleGuard    = require('../middleware/roleGuard');
const { uploadDriverDocs, uploadSelfie } = require('../middleware/upload');
const kycService                 = require('../services/kycService');
const rcService                  = require('../services/rcService');
const surepassService            = require('../services/surepassService');
const driverController           = require('../controllers/driverController');
const driverFaceLivenessService  = require('../services/driverFaceLivenessService');
const { apiLimiter } = require('../middleware/rateLimiter');

const uploadComplaint = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 5 * 1024 * 1024 },
});

// memoryStorage multer for face-liveness — Rekognition needs raw bytes
const uploadSelfieMem = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) return cb(null, true);
    cb(Object.assign(new Error('Only image files are allowed'), { code: 'INVALID_FILE_TYPE' }));
  },
}).single('selfie');

const router = Router();
router.use(apiLimiter);

// ── Helper: wrap multer errors ────────────────────────────────────────────────
function multerErrorHandler(upload) {
  return (req, res, next) => {
    upload(req, res, (err) => {
      if (!err) return next();
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(422).json({ error: { code: 'FILE_TOO_LARGE', message: 'File exceeds 5MB limit.', details: {} } });
      }
      return next(err);
    });
  };
}

// ── KYC (document upload) ─────────────────────────────────────────────────────
router.post('/kyc/upload',    authMiddleware, roleGuard('driver'), multerErrorHandler(uploadDriverDocs), async (req, res, next) => {
  try { return res.status(200).json(await kycService.submitKYC(req.user.userId, req.files, req.body)); }
  catch (err) { return err.code && err.status ? res.status(err.status).json({ error: { code: err.code, message: err.message, details: {} } }) : next(err); }
});


router.post('/kyc/re-upload', authMiddleware, roleGuard('driver'), multerErrorHandler(uploadDriverDocs), async (req, res, next) => {
  try { return res.status(200).json(await kycService.resubmitKYC(req.user.userId, req.files)); }
  catch (err) { return err.code && err.status ? res.status(err.status).json({ error: { code: err.code, message: err.message, details: {} } }) : next(err); }
});

// ── DigiLocker — Aadhaar consent flow ────────────────────────────────────────

/**
 * POST /drivers/digilocker/create-url
 * Body: { purpose?, signup?, pinlessAuthentication? }
 *
 * Generates a DigiLocker consent URL using the v2 Direct API (with match scores).
 * Match scores (nameMatchScore, dobMatch, faceMatchScore, pincodeMatch) are
 * sent asynchronously by Signzy to POST /webhooks/signzy/digilocker-match-callback.
 *
 * Returns: { url, requestId }
 */
router.post('/digilocker/create-url', authMiddleware, roleGuard('driver'), async (req, res, next) => {
  try {
    const supabase  = require('../config/supabase');
    const driverId  = req.user.userId;

    const { data: rows } = await supabase
      .from('drivers')
      .select('name, phone, dob, profile_photo_url, selfie_url')
      .eq('id', driverId)
      .limit(1);
    const driver = rows?.[0];
    if (!driver) return res.status(404).json({ error: { code: 'DRIVER_NOT_FOUND', message: 'Driver not found.', details: {} } });

    const BACKEND_URL        = process.env.BACKEND_URL ?? 'http://localhost:3000';
    const callbackUrl        = `${BACKEND_URL}/webhooks/signzy/digilocker-match-callback`;
    const successRedirectUrl = `${BACKEND_URL}/webhooks/signzy/digilocker-callback`;
    const failureRedirectUrl = `${BACKEND_URL}/webhooks/signzy/digilocker-callback?status=failed`;

    const result = await kycService.createDigilockerUrlDirect({
      name:              driver.name,
      dob:               driver.dob ?? undefined,          // dd/mm/yyyy if stored
      selfieImage:       driver.selfie_url ?? driver.profile_photo_url ?? undefined,
      callbackUrl,
      successRedirectUrl,
      failureRedirectUrl,
      successRedirectTime: 3,
      failureRedirectTime: 5,
      signup:  req.body?.signup  ?? true,
      purpose: req.body?.purpose ?? 'kyc',
      internalId: driverId,                               // track callback by driver ID
      pinlessAuthentication: req.body?.pinlessAuthentication ?? undefined,
    });

    // Persist the requestId + session start time
    if (result?.requestId) {
      await supabase.from('drivers').update({
        signzy_request_id:     result.requestId,
        digilocker_request_id: result.requestId,
      }).eq('id', driverId);
    }

    return res.status(200).json({ url: result.url, requestId: result.requestId });
  } catch (err) {
    if (err.response?.data) {
      const status = err.response.status || 502;
      return res.status(status).json({ error: { code: 'SIGNZY_ERROR', message: 'Signzy API error', details: err.response.data } });
    }
    if (err.code && err.status) return res.status(err.status).json({ error: { code: err.code, message: err.message, details: {} } });
    return next(err);
  }
});

/**
 * POST /drivers/digilocker/get-details
 * Body: { requestId? }
 *   requestId is optional — falls back to the stored record from create-url.
 *
 * Returns:
 *   result.userDetails — { digilockerid, name, dob, gender, eaadhaar, mobile }
 *   result.files       — Array of all linked issued documents with doctype, issuer, id
 *
 * Side-effects (non-fatal):
 *   - Persists digilocker_doc_inventory (JSON) to the driver record
 *   - Extracts & persists dl_number / pan from document IDs if not already set
 */
router.post('/digilocker/get-details', authMiddleware, roleGuard('driver'), async (req, res, next) => {
  try {
    const supabase = require('../config/supabase');
    const logger   = require('../utils/logger');
    const driverId = req.user.userId;

    // Resolve requestId
    let { requestId } = req.body || {};
    if (!requestId) {
      const { data: rows } = await supabase
        .from('drivers')
        .select('signzy_request_id')
        .eq('id', driverId)
        .limit(1);
      requestId = rows?.[0]?.signzy_request_id;
    }
    if (!requestId) {
      return res.status(422).json({
        error: { code: 'MISSING_REQUEST_ID', message: 'requestId is required. Initiate the DigiLocker flow first via /digilocker/create-url.', details: {} },
      });
    }

    const data = await kycService.getDetailsDirect(requestId);

    // ── Parse & persist useful fields (non-fatal) ─────────────────────────────
    try {
      const userDetails = data?.result?.userDetails || {};
      const files       = data?.result?.files       || [];
      const updates     = {};

      // Store the full document inventory as JSON for admin review
      if (files.length) {
        updates.digilocker_doc_inventory = JSON.stringify(files.map((f) => ({
          name:        f.name,
          doctype:     f.doctype,
          description: f.description,
          issuer:      f.issuer,
          issuerid:    f.issuerid,
          id:          f.id,
          date:        f.date,
        })));
      }

      // Extract DL number from the document id if format matches
      // e.g.  "in.gov.transport-DRVLC-HR2620110123456"
      const dlFile = files.find((f) =>
        f.doctype === 'DRVLC' ||
        f.issuerid?.includes('transport') ||
        (f.id && f.id.includes('-DRVLC-'))
      );
      if (dlFile?.id) {
        const dlMatch = dlFile.id.match(/-DRVLC-(.+)$/i);
        if (dlMatch?.[1]) updates.dl_number_from_digilocker = dlMatch[1].trim();
      }

      // Extract PAN number from the document id if format matches
      // e.g.  "in.gov.cbdt-PANCR-ABCDE1234F"
      const panFile = files.find((f) =>
        f.doctype === 'PANCR' ||
        f.issuerid?.includes('cbdt') ||
        (f.id && f.id.includes('-PANCR-'))
      );
      if (panFile?.id) {
        const panMatch = panFile.id.match(/-PANCR-(.+)$/i);
        if (panMatch?.[1]) updates.pan_from_digilocker = panMatch[1].trim();
      }

      // Persist eAadhaar availability flag
      if (userDetails.eaadhaar) {
        updates.has_eaadhaar = userDetails.eaadhaar === 'Y';
      }

      if (Object.keys(updates).length) {
        await supabase.from('drivers').update(updates).eq('id', driverId);
      }
    } catch (persistErr) {
      logger.warn('drivers.digilocker/get-details — persist failed (non-fatal)', { error: persistErr.message });
    }

    return res.status(200).json(data);
  } catch (err) {
    if (err.response?.data) {
      const status = err.response.status || 502;
      return res.status(status).json({ error: { code: 'SIGNZY_ERROR', message: 'Signzy API error', details: err.response.data } });
    }
    if (err.code && err.status) return res.status(err.status).json({ error: { code: err.code, message: err.message, details: {} } });
    return next(err);
  }
});

/**
 * POST /drivers/digilocker/get-eaadhaar
 * Body: { requestId?, extraDigitalCertificateParams?, getBase64Files?, getEAadhaarPdf?, getEAadhaarJpeg? }
 *   requestId is optional — falls back to the one stored on the driver record from create-url.
 * Returns full e-Aadhaar identity payload from the Signzy v2 direct API.
 */
router.post('/digilocker/get-eaadhaar', authMiddleware, roleGuard('driver'), async (req, res, next) => {
  try {
    const supabase = require('../config/supabase');
    const logger   = require('../utils/logger');
    const driverId = req.user.userId;

    // Resolve requestId: body value takes priority, then fall back to stored record
    let { requestId, extraDigitalCertificateParams, getBase64Files, getEAadhaarPdf, getEAadhaarJpeg } = req.body || {};
    if (!requestId) {
      const { data: rows } = await supabase
        .from('drivers')
        .select('signzy_request_id')
        .eq('id', driverId)
        .limit(1);
      requestId = rows?.[0]?.signzy_request_id;
    }
    if (!requestId) {
      return res.status(422).json({
        error: { code: 'MISSING_REQUEST_ID', message: 'requestId is required. Initiate the DigiLocker flow first via /digilocker/create-url.', details: {} },
      });
    }

    const data = await kycService.getEAadhaarDirect(requestId, {
      extraDigitalCertificateParams: extraDigitalCertificateParams !== false,   // default true
      getBase64Files:  !!getBase64Files,
      getEAadhaarPdf:  !!getEAadhaarPdf,
      getEAadhaarJpeg: !!getEAadhaarJpeg,
    });

    // Persist key identity fields to the driver record (non-fatal)
    try {
      const r = data?.result || {};
      const updates = {};
      if (r.name)    updates.aadhaar_name      = r.name;
      if (r.dob)     updates.aadhaar_dob        = r.dob;    // DD/MM/YYYY from Signzy
      if (r.gender)  updates.aadhaar_gender     = r.gender;
      if (r.uid)     updates.aadhaar_uid        = r.uid;    // masked: xxxxxxxx0353
      if (r.address) updates.aadhaar_address    = r.address;
      if (r.photo)   updates.aadhaar_photo_url  = r.photo;
      // Mark Aadhaar as DigiLocker-verified; full KYC review still pending
      updates.aadhaar_status        = 'verified';
      updates.kyc_status            = 'pending';
      updates.digilocker_consent_at = new Date().toISOString();
      await supabase.from('drivers').update(updates).eq('id', driverId);
    } catch (persistErr) {
      logger.warn('drivers.digilocker/get-eaadhaar — persist failed (non-fatal)', { error: persistErr.message });
    }

    return res.status(200).json(data);
  } catch (err) {
    if (err.response?.data) {
      const status = err.response.status || 502;
      return res.status(status).json({ error: { code: 'SIGNZY_ERROR', message: 'Signzy API error', details: err.response.data } });
    }
    if (err.code && err.status) return res.status(err.status).json({ error: { code: err.code, message: err.message, details: {} } });
    return next(err);
  }
});

// ── DL Verification ───────────────────────────────────────────────────────────

/**
 * POST /drivers/dl/verify
 * Body: { dl_number?, dob?, full_name? }  — all optional (fall back to DB values)
 *
 * Triggers a live DL verification against the Surepass API.
 * On success persists: driving_licence_status, expiry, issued_at, vehicle_class,
 * dl_surepass_name, dl_gender, dl_issuing_state, dl_ola_name, dl_blood_group.
 *
 * Returns:
 *   { verified, dl_status, license_number, name, doe, doi, vehicle_classes,
 *     gender, state, ola_name }
 */
router.post('/dl/verify', authMiddleware, roleGuard('driver'), async (req, res, next) => {
  try {
    const supabase = require('../config/supabase');
    const logger   = require('../utils/logger');
    const driverId = req.user.userId;

    // Fetch stored driver fields as fallback
    const { data: rows } = await supabase
      .from('drivers')
      .select('dl_number, dl_number_from_digilocker, dob, aadhaar_dob, name')
      .eq('id', driverId)
      .limit(1);
    const driver = rows?.[0] ?? {};

    // Body params override stored values
    const dlNumber = req.body?.dl_number  || driver.dl_number || driver.dl_number_from_digilocker;
    const dob      = req.body?.dob        || driver.dob       || driver.aadhaar_dob;  // YYYY-MM-DD
    const fullName = req.body?.full_name  || driver.name;

    if (!dlNumber) {
      return res.status(422).json({
        error: { code: 'MISSING_DL_NUMBER', message: 'Driving Licence number is required. Please update your profile first.', details: {} },
      });
    }

    const payload = await surepassService.verifyDL(dlNumber, { fullName, dob });
    await surepassService.persistDLVerification(driverId, payload);

    const d = payload?.data || {};
    logger.info('drivers.dl/verify — completed', { driverId, dlNumber, success: payload?.success });

    return res.status(200).json({
      verified:       payload?.success === true,
      dl_status:      payload?.success ? (d.doe && new Date(d.doe) < new Date() ? 'expired' : 'verified') : 'rejected',
      license_number: d.license_number  || dlNumber,
      name:           d.name            || null,
      doe:            d.doe             || null,
      doi:            d.doi             || null,
      vehicle_classes: d.vehicle_classes || [],
      gender:         d.gender          || null,
      state:          d.state           || null,
      ola_name:       d.ola_name        || null,
    });
  } catch (err) {
    if (err.response?.data) {
      const status = err.response.status || 502;
      return res.status(status).json({
        error: { code: 'SUREPASS_ERROR', message: 'Surepass DL API error', details: err.response.data },
      });
    }
    if (err.code && err.status) return res.status(err.status).json({ error: { code: err.code, message: err.message, details: {} } });
    return next(err);
  }
});


// ── RC Verification ───────────────────────────────────────────────────────────

/**
 * POST /drivers/rc/verify
 * Body: { rc_number?, enrich? }
 *   rc_number — optional; falls back to vehicle_reg_no stored on the driver record.
 *   enrich    — optional boolean; true → enriched mode (owner name + chassis visible).
 *               Defaults to false (masked). Use true only when admin-level detail needed.
 *
 * Verifies the vehicle registration certificate via the Surepass RC V2 API and
 * persists the result to the drivers table.
 *
 * Returns:
 *   { verified, rc_status, rc_number, maker_model, fuel_type,
 *     insurance_upto, fit_upto, blacklist_status, response_metadata }
 */
router.post('/rc/verify', authMiddleware, roleGuard('driver'), async (req, res, next) => {
  try {
    const supabase = require('../config/supabase');
    const logger   = require('../utils/logger');
    const driverId = req.user.userId;

    // Resolve RC number: body param → stored vehicle_reg_no
    let { rc_number, enrich } = req.body || {};
    if (!rc_number) {
      const { data: rows } = await supabase
        .from('drivers')
        .select('vehicle_reg_no')
        .eq('id', driverId)
        .limit(1);
      rc_number = rows?.[0]?.vehicle_reg_no;
    }

    if (!rc_number) {
      return res.status(422).json({
        error: {
          code:    'MISSING_RC_NUMBER',
          message: 'Vehicle registration number is required. Please update your vehicle details first.',
          details: {},
        },
      });
    }

    const payload = await rcService.verifyRC(rc_number, !!enrich);
    await rcService.persistRCVerification(driverId, payload);

    const d = payload?.data || {};
    logger.info('drivers.rc/verify — completed', {
      driverId, rc_number,
      success: payload?.success,
    });

    return res.status(200).json({
      verified:           payload?.success === true,
      rc_status:          payload?.success ? (d.blacklist_status ? 'blacklisted' : 'verified') : 'rejected',
      rc_number:          d.rc_number          || rc_number,
      maker_model:        d.maker_model         || null,
      fuel_type:          d.fuel_type           || null,
      insurance_upto:     d.insurance_upto      || null,
      fit_upto:           d.fit_up_to           || null,
      blacklist_status:   d.blacklist_status     || '',
      response_metadata:  d.response_metadata    || {},
    });
  } catch (err) {
    if (err.response?.data) {
      const status = err.response.status || 502;
      return res.status(status).json({
        error: { code: 'SUREPASS_ERROR', message: 'Surepass RC API error', details: err.response.data },
      });
    }
    if (err.code && err.status) {
      return res.status(err.status).json({ error: { code: err.code, message: err.message, details: {} } });
    }
    return next(err);
  }
});

// ── Phone change (authenticated) ────────────────────────────────────────────────
router.post('/profile/phone/send-otp',  authMiddleware, roleGuard('driver'), driverController.sendDriverPhoneChangeOtp);
router.post('/profile/phone/resend-otp', authMiddleware, roleGuard('driver'), driverController.sendDriverPhoneChangeOtp);
router.post('/profile/phone/verify-otp', authMiddleware, roleGuard('driver'), driverController.verifyDriverPhoneChangeOtp);

// ── Onboarding ───────────────────────────────────────────────────────────────────
router.post('/vehicle',           authMiddleware, roleGuard('driver'), driverController.submitVehicleDetails);
router.post('/verify-identity',   authMiddleware, roleGuard('driver'), multerErrorHandler(uploadSelfie), driverController.submitSelfieVerification);

/**
 * POST /drivers/face-liveness
 * multipart/form-data — field: selfie  (JPEG or PNG, ≤5 MB)
 *
 * Runs AWS Rekognition DetectFaces on the selfie to:
 *   - Detect a single clear face (liveness proxy)
 *   - Predict gender with confidence
 *   - Save the image to S3 as selfie_url and profile_photo_url on approval
 *
 * Response: { status, reason?, gender?, gender_confidence?, selfie_url?, attempts_used?, retry_remaining? }
 *   status: 'approved' | 'rejected' | 'retry' | 'manual_review'
 */
router.post(
  '/face-liveness',
  authMiddleware,
  roleGuard('driver'),
  (req, res, next) => uploadSelfieMem(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE')   return res.status(422).json({ error: { code: 'FILE_TOO_LARGE',    message: 'Selfie exceeds 5 MB limit.',         details: {} } });
    if (err.code === 'INVALID_FILE_TYPE') return res.status(422).json({ error: { code: 'INVALID_FILE_TYPE', message: 'Only image files are accepted.',       details: {} } });
    return next(err);
  }),
  async (req, res, next) => {
    try {
      const driverId   = req.user.userId;
      const fileBuffer = req.file?.buffer;
      const mimeType   = req.file?.mimetype ?? 'image/jpeg';

      if (!fileBuffer) {
        return res.status(422).json({
          error: { code: 'MISSING_FILE', message: 'Selfie image is required.', details: {} },
        });
      }

      const result = await driverFaceLivenessService.verifyDriverSelfie(driverId, fileBuffer, mimeType);
      return res.status(200).json(result);
    } catch (err) {
      if (err.code && err.status) {
        return res.status(err.status).json({ error: { code: err.code, message: err.message, details: {} } });
      }
      return next(err);
    }
  }
);

/**
 * POST /drivers/face-photo
 * Body: { image: '<base64 string>' }   (JPEG/PNG, ≤ 5 MB)
 *
 * JSON-based alternative to /face-liveness — no multipart needed.
 * Decodes base64, runs DetectFaces via driverFaceLivenessService, returns same shape.
 */
router.post('/face-photo', authMiddleware, roleGuard('driver'), async (req, res, next) => {
  try {
    const driverId = req.user.userId;
    const image    = req.body?.image;

    if (!image || typeof image !== 'string') {
      return res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: 'image (base64) is required', details: {} } });
    }

    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const fileBuffer = Buffer.from(base64Data, 'base64');

    if (fileBuffer.length < 1000) {
      return res.status(422).json({ error: { code: 'IMAGE_TOO_SMALL', message: 'Image too small or corrupted.', details: {} } });
    }

    const result = await driverFaceLivenessService.verifyDriverSelfie(driverId, fileBuffer, 'image/jpeg');
    return res.status(200).json(result);
  } catch (err) {
    if (err.code && err.status) {
      return res.status(err.status).json({ error: { code: err.code, message: err.message, details: {} } });
    }
    return next(err);
  }
});

/**
 * POST /drivers/face-analyze
 * Body: { image_base64: string }   (JPEG base64, ≤ 1 MB recommended)
 *
 * Real-time frame analysis for the liveness state-machine.
 * Called every ~600 ms during guided verification.
 * Stateless — no DB writes.
 */
router.post(
  '/face-analyze',
  authMiddleware,
  roleGuard('driver'),
  async (req, res, next) => {
    try {
      const { image_base64 } = req.body || {};
      if (!image_base64 || typeof image_base64 !== 'string') {
        return res.status(422).json({ error: { code: 'MISSING_IMAGE', message: 'image_base64 is required', details: {} } });
      }

      const imageBuffer = Buffer.from(image_base64, 'base64');
      if (imageBuffer.length < 1000) {
        return res.status(422).json({ error: { code: 'IMAGE_TOO_SMALL', message: 'Image too small or corrupted', details: {} } });
      }

      const result = await driverFaceLivenessService.analyzeFrame(imageBuffer);
      return res.status(200).json(result);
    } catch (err) {
      if (err.code && err.status) {
        return res.status(err.status).json({ error: { code: err.code, message: err.message, details: {} } });
      }
      return next(err);
    }
  }
);

// ── Complaints ────────────────────────────────────────────────────────────────────
router.get('/complaints',         authMiddleware, roleGuard('driver'), driverController.listDriverComplaints);
router.post('/complaints',        authMiddleware, roleGuard('driver'), uploadComplaint.single('screenshot'), driverController.submitDriverComplaint);


// ── Settings ────────────────────────────────────────────────────────────────────
router.patch('/notification-settings', authMiddleware, roleGuard('driver'), driverController.updateNotificationSettings);
router.patch('/payment-details',       authMiddleware, roleGuard('driver'), driverController.updatePaymentDetails);

// ── Online / Offline ──────────────────────────────────────────────────────────
router.patch('/status',          authMiddleware, roleGuard('driver'), driverController.updateDriverStatus);

// ── Demand Zones ──────────────────────────────────────────────────────────────
router.get('/demand-zones',      authMiddleware, roleGuard('driver'), driverController.getDemandZones);

// ── Earnings ──────────────────────────────────────────────────────────────────
router.get('/earnings/today',    authMiddleware, roleGuard('driver'), driverController.getEarningsToday);
router.get('/earnings/weekly',   authMiddleware, roleGuard('driver'), driverController.getEarningsWeekly);
router.get('/earnings/ledger',   authMiddleware, roleGuard('driver'), driverController.getEarningsLedger);

// ── Ride History ──────────────────────────────────────────────────────────────
router.get('/rides',             authMiddleware, roleGuard('driver'), driverController.getDriverRides);

// ── Profile ───────────────────────────────────────────────────────────────────
router.get('/profile',           authMiddleware, roleGuard('driver'), driverController.getDriverProfile);
router.patch('/profile',
  authMiddleware,
  roleGuard('driver'),
  multerErrorHandler(uploadSelfie), // optional photo upload
  driverController.updateDriverProfile
);

// ── Subscription ─────────────────────────────────────────────────────────────────────────────
router.get('/subscription',       authMiddleware, roleGuard('driver'), driverController.getSubscriptionStatus);

// ── Commission status ──────────────────────────────────────────────────────────────────────
router.get('/commission/status',  authMiddleware, roleGuard('driver'), driverController.getCommissionStatus);

// ── Location update (REST fallback from background task) ──────────────────────────
router.post('/location',          authMiddleware, roleGuard('driver'), driverController.updateLocation);

// ── Transaction history ────────────────────────────────────────────────────────────
router.get('/transactions',       authMiddleware, roleGuard('driver'), driverController.getDriverTransactions);

// ── Documents / KYC status ─────────────────────────────────────────────────────────
router.get('/documents',          authMiddleware, roleGuard('driver'), driverController.getDriverDocuments);

// ── Subscription opt-in toggle ─────────────────────────────────────────────────────
router.patch('/subscription/opt-in', authMiddleware, roleGuard('driver'), driverController.toggleSubscriptionOptIn);

// ── Recent rides (for complaint picker) ────────────────────────────────────────────
router.get('/rides/recent', authMiddleware, roleGuard('driver'), driverController.getRecentRides);

// ── Payment details (GET) ──────────────────────────────────────────────────────────
router.get('/payment-details', authMiddleware, roleGuard('driver'), driverController.getPaymentDetails);

// ── Subscription schedule (today + upcoming week) ──────────────────────────────────
router.get('/subscription/schedule', authMiddleware, roleGuard('driver'), driverController.getSubscriptionSchedule);

// ── Subscription weekly calendar (7-day view) ──────────────────────────────────────
router.get('/subscription/weekly-calendar', authMiddleware, roleGuard('driver'), driverController.getWeeklyCalendar);

// ── Transaction export ─────────────────────────────────────────────────────────────
router.post('/transactions/export', authMiddleware, roleGuard('driver'), driverController.exportTransactions);

module.exports = router;

