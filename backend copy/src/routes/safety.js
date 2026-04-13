'use strict';

const { Router } = require('express');
const authMiddleware    = require('../middleware/authMiddleware');
const roleGuard         = require('../middleware/roleGuard');
const safetyController  = require('../controllers/safetyController');
const { sosLimiter, apiLimiter } = require('../middleware/rateLimiter');

const router = Router();

// General API rate limit
router.use(apiLimiter);

// ── SOS ───────────────────────────────────────────────────────────────────────
router.post('/sos',                    authMiddleware, roleGuard('rider', 'driver'), sosLimiter, safetyController.triggerSOS);
router.post('/sos/cancel',             authMiddleware, roleGuard('rider', 'driver'), safetyController.cancelSOS);

// ── Emergency Contacts (riders: emergency_contacts; drivers: driver_emergency_contacts) ──
router.get('/emergency-contacts',      authMiddleware, roleGuard('rider', 'driver'), safetyController.getEmergencyContacts);
router.post('/emergency-contacts',     authMiddleware, roleGuard('rider', 'driver'), safetyController.addEmergencyContact);
router.delete('/emergency-contacts/:id', authMiddleware, roleGuard('rider', 'driver'), safetyController.deleteEmergencyContact);

// ── Live Sharing ──────────────────────────────────────────────────────────────
router.post('/share-trip/:ride_id',    authMiddleware, roleGuard('rider'),           safetyController.shareTrip);

// ── Masked Calling ────────────────────────────────────────────────────────────
// Named param variant (driver app): /safety/call/:ride_id
router.post('/call/:ride_id',          authMiddleware, roleGuard('rider', 'driver'), safetyController.initiateCall);
// Body variant (customer app): POST /safety/call  { rideId }
router.post('/call',                   authMiddleware, roleGuard('rider', 'driver'), (req, res, next) => {
  req.params.ride_id = req.body.rideId; // normalise for controller
  safetyController.initiateCall(req, res, next);
});

// ── Battery Low (REST fallback) ───────────────────────────────────────────────
router.post('/battery-low',            authMiddleware, roleGuard('rider', 'driver'), safetyController.batteryLow);
// Alias used by customer app
router.post('/battery-alert',          authMiddleware, roleGuard('rider', 'driver'), safetyController.batteryLow);

module.exports = router;
