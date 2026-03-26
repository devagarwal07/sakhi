'use strict';

const { Router } = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const roleGuard = require('../middleware/roleGuard');
const subscriptionController = require('../controllers/subscriptionController');

const router = Router();

router.get('/',            authMiddleware, roleGuard('rider'), subscriptionController.listSubscriptions);
router.get('/:id',         authMiddleware, roleGuard('rider'), subscriptionController.getSubscription);
router.get('/:id/status',  authMiddleware, roleGuard('rider'), subscriptionController.getSubscriptionStatus);
router.patch('/:id/pause', authMiddleware, roleGuard('rider'), subscriptionController.pauseSubscription);
router.patch('/:id/resume',authMiddleware, roleGuard('rider'), subscriptionController.resumeSubscription);
router.patch('/:id/cancel',authMiddleware, roleGuard('rider'), subscriptionController.cancelSubscription);

module.exports = router;
