// backend/routes/analyticsRoutes.js

const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { authenticate, requireAdmin } = require('../middleware/auth');

// Admin routes
router.get(
    '/dashboard',
    authenticate, requireAdmin,
    analyticsController.getDashboard
);

router.get(
    '/event/:event_id',
    authenticate, requireAdmin,
    analyticsController.getEventAnalytics
);

router.get(
    '/overall',
    authenticate, requireAdmin,
    analyticsController.getOverallAnalytics
);

module.exports = router;