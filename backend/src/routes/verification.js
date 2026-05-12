'use strict';

const { Router } = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const roleGuard = require('../middleware/roleGuard');
const { uploadAadhaar, uploadSelfie } = require('../middleware/upload');
const verificationService = require('../services/verificationService');
const faceLivenessService = require('../services/faceLivenessService');
const faceLivenessCredentialsService = require('../services/faceLivenessCredentialsService');

const router = Router();

// ── Helper: wrap multer errors into JSON ──────────────────────────────────────
function multerErrorHandler(upload) {
  return (req, res, next) => {
    upload(req, res, (err) => {
      if (!err) return next();
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(422).json({ error: { code: 'FILE_TOO_LARGE', message: 'File exceeds 5MB limit.', details: {} } });
      }
      if (err.code === 'INVALID_FILE_TYPE') {
        return res.status(422).json({ error: { code: 'INVALID_FILE_TYPE', message: err.message, details: {} } });
      }
      return next(err);
    });
  };
}

/**
 * POST /auth/verify/aadhaar-upload
 * multipart/form-data — fields: front, back
 */
router.post(
  '/aadhaar-upload',
  authMiddleware,
  roleGuard('rider'),
  multerErrorHandler(uploadAadhaar),
  async (req, res, next) => {
    try {
      const result = await verificationService.verifyAadhaarUpload(req.user.userId, req.files);
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
 * POST /auth/verify/facial
 * multipart/form-data — field: selfie
 */
router.post(
  '/facial',
  authMiddleware,
  roleGuard('rider'),
  multerErrorHandler(uploadSelfie),
  async (req, res, next) => {
    try {
      const result = await verificationService.verifyFacial(req.user.userId, req.file);
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
 * POST /auth/verify/face-liveness/session
 * Creates a Rekognition Face Liveness SessionId.
 */
router.post('/face-liveness/session', authMiddleware, roleGuard('rider'), async (req, res, next) => {
  try {
    const result = await faceLivenessService.createSession(req.user.userId);
    return res.status(200).json(result);
  } catch (err) {
    if (err.code && err.status) {
      return res.status(err.status).json({ error: { code: err.code, message: err.message, details: {} } });
    }
    return next(err);
  }
});

/**
 * GET /auth/verify/face-liveness/credentials
 * Issues short-lived AWS credentials for the web liveness client.
 */
router.get('/face-liveness/credentials', authMiddleware, roleGuard('rider'), async (req, res, next) => {
  try {
    const credentials = await faceLivenessCredentialsService.getStreamingCredentials(req.user.userId);
    return res.status(200).json({ credentials });
  } catch (err) {
    if (err.code && err.status) {
      return res.status(err.status).json({ error: { code: err.code, message: err.message, details: {} } });
    }
    return next(err);
  }
});

/**
 * POST /auth/verify/face-liveness/result
 * Body: { session_id }
 */
router.post('/face-liveness/result', authMiddleware, roleGuard('rider'), async (req, res, next) => {
  try {
    const sessionId = req.body?.session_id;
    const result = await faceLivenessService.completeSession(req.user.userId, sessionId);
    return res.status(200).json(result);
  } catch (err) {
    if (err.code && err.status) {
      return res.status(err.status).json({ error: { code: err.code, message: err.message, details: {} } });
    }
    return next(err);
  }
});

/**
 * POST /auth/verify/face-photo
 * Body: { image: '<base64 string>' }
 * No streaming — single photo → DetectFaces → gender decision.
 */
router.post('/face-photo', authMiddleware, roleGuard('rider'), async (req, res, next) => {
  try {
    const image = req.body?.image;
    if (!image || typeof image !== 'string') {
      return res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: 'image (base64) is required', details: {} } });
    }
    const result = await faceLivenessService.verifyFacePhoto(req.user.userId, image);
    return res.status(200).json(result);
  } catch (err) {
    if (err.code && err.status) {
      return res.status(err.status).json({ error: { code: err.code, message: err.message, details: {} } });
    }
    return next(err);
  }
});

module.exports = router;
