'use strict';

const { Router } = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const roleGuard = require('../middleware/roleGuard');
const { uploadAadhaar, uploadSelfie } = require('../middleware/upload');
const verificationService = require('../services/verificationService');

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

module.exports = router;
