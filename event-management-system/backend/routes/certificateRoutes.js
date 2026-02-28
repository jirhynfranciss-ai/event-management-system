// backend/routes/certificateRoutes.js

const express = require('express');
const router = express.Router();
const certificateController = require('../controllers/certificateController');
const { authenticate, requireAdmin } = require('../middleware/auth');

// Admin routes
router.post(
    '/generate',
    authenticate, requireAdmin,
    certificateController.generateCertificate
);

router.post(
    '/bulk-generate',
    authenticate, requireAdmin,
    certificateController.bulkGenerateCertificates
);

// Student routes
router.get(
    '/my-certificates',
    authenticate,
    certificateController.getMyCertificates
);

router.get(
    '/download/:certificate_id',
    authenticate,
    certificateController.downloadCertificate
);

// Public route - verify certificate
router.get('/verify/:code', certificateController.verifyCertificate);

module.exports = router;