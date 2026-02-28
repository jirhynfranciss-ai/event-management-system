// backend/routes/attendanceRoutes.js

const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const { authenticate, requireAdmin } = require('../middleware/auth');

// Admin routes
router.post(
    '/mark',
    authenticate, requireAdmin,
    attendanceController.markAttendance
);

router.post(
    '/bulk-mark',
    authenticate, requireAdmin,
    attendanceController.bulkMarkAttendance
);

router.post(
    '/qr-checkin',
    authenticate, requireAdmin,
    attendanceController.qrCheckIn
);

router.get(
    '/log/:event_id',
    authenticate, requireAdmin,
    attendanceController.getAttendanceLog
);

module.exports = router;