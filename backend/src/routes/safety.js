'use strict';

const { Router } = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const roleGuard = require('../middleware/roleGuard');
const safetyController = require('../controllers/safetyController');

const router = Router();

// ── SOS ───────────────────────────────────────────────────────────────────────
router.post('/sos',                    authMiddleware, roleGuard('rider', 'driver'), safetyController.triggerSOS);

// ── Emergency Contacts ────────────────────────────────────────────────────────
router.get('/emergency-contacts',      authMiddleware, roleGuard('rider'),           safetyController.getEmergencyContacts);
router.post('/emergency-contacts',     authMiddleware, roleGuard('rider'),           safetyController.addEmergencyContact);
router.delete('/emergency-contacts/:id', authMiddleware, roleGuard('rider'),         safetyController.deleteEmergencyContact);

// ── Live Sharing ──────────────────────────────────────────────────────────────
router.post('/share-trip/:ride_id',    authMiddleware, roleGuard('rider'),           safetyController.shareTrip);

// ── Masked Calling ────────────────────────────────────────────────────────────
router.post('/call/:ride_id',          authMiddleware, roleGuard('rider', 'driver'), safetyController.initiateCall);

// ── Battery Low (REST fallback) ───────────────────────────────────────────────
router.post('/battery-low',            authMiddleware, roleGuard('rider', 'driver'), safetyController.batteryLow);

module.exports = router;
