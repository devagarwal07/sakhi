'use strict';

const { Router } = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const roleGuard      = require('../middleware/roleGuard');
const notif          = require('../controllers/notificationController');
const { apiLimiter } = require('../middleware/rateLimiter');

const router = Router();
router.use(apiLimiter);

// ── FCM token updates ────────────────────────────────────────────────────────
router.patch('/users/fcm-token',   authMiddleware, roleGuard('rider'),  notif.updateRiderFcmToken);
router.patch('/drivers/fcm-token', authMiddleware, roleGuard('driver'), notif.updateDriverFcmToken);

// ── Driver FCM health check ────────────────────────────────────────────────
router.get('/driver-health', authMiddleware, roleGuard('driver'), notif.getDriverFcmHealth);

// ── Notification history ─────────────────────────────────────────────────────
router.get('/',           authMiddleware, notif.getNotifications);
router.post('/read-all',  authMiddleware, notif.markAllRead);
router.post('/:id/read',  authMiddleware, notif.markRead);

module.exports = router;
