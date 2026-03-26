'use strict';

const { Router } = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const roleGuard = require('../middleware/roleGuard');
const { uploadDriverDocs, uploadSelfie } = require('../middleware/upload');
const kycService = require('../services/kycService');
const driverController = require('../controllers/driverController');

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

// ── KYC ───────────────────────────────────────────────────────────────────────
router.post('/kyc/upload',    authMiddleware, roleGuard('driver'), multerErrorHandler(uploadDriverDocs), async (req, res, next) => {
  try { return res.status(200).json(await kycService.submitKYC(req.user.userId, req.files)); }
  catch (err) { return err.code && err.status ? res.status(err.status).json({ error: { code: err.code, message: err.message, details: {} } }) : next(err); }
});

router.post('/kyc/re-upload', authMiddleware, roleGuard('driver'), multerErrorHandler(uploadDriverDocs), async (req, res, next) => {
  try { return res.status(200).json(await kycService.resubmitKYC(req.user.userId, req.files)); }
  catch (err) { return err.code && err.status ? res.status(err.status).json({ error: { code: err.code, message: err.message, details: {} } }) : next(err); }
});

// ── Online / Offline ──────────────────────────────────────────────────────────
router.patch('/status',          authMiddleware, roleGuard('driver'), driverController.updateDriverStatus);

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

module.exports = router;

