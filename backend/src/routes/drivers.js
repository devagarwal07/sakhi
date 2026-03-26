'use strict';

const { Router } = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const roleGuard = require('../middleware/roleGuard');
const { uploadDriverDocs } = require('../middleware/upload');
const kycService = require('../services/kycService');

const router = Router();

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

/**
 * POST /drivers/kyc/upload
 * multipart/form-data — fields: dl, rc, insurance, aadhaar, profile_photo
 */
router.post(
  '/kyc/upload',
  authMiddleware,
  roleGuard('driver'),
  multerErrorHandler(uploadDriverDocs),
  async (req, res, next) => {
    try {
      const result = await kycService.submitKYC(req.user.userId, req.files);
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
 * POST /drivers/kyc/re-upload
 * Same as upload but restricted to rejected / manual_review status.
 */
router.post(
  '/kyc/re-upload',
  authMiddleware,
  roleGuard('driver'),
  multerErrorHandler(uploadDriverDocs),
  async (req, res, next) => {
    try {
      const result = await kycService.resubmitKYC(req.user.userId, req.files);
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
