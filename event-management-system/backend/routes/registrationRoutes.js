// backend/routes/registrationRoutes.js

const express = require('express');
const router = express.Router();
const registrationController = require('../controllers/registrationController');
const { authenticate, requireStudent } = require('../middleware/auth');

// Student routes
router.post(
    '/',
    authenticate, requireStudent,
    registrationController.registerForEvent
);

router.delete(
    '/:registration_id',
    authenticate, requireStudent,
    registrationController.cancelRegistration
);

router.get(
    '/my-registrations',
    authenticate,
    registrationController.getMyRegistrations
);

router.get(
    '/check/:event_id',
    authenticate,
    registrationController.checkRegistration
);

module.exports = router;