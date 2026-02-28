// backend/routes/eventRoutes.js

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const eventController = require('../controllers/eventController');
const { authenticate, requireAdmin } = require('../middleware/auth');

// Multer configuration for event image uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../uploads'));
    },
    filename: (req, file, cb) => {
        const uniqueName = `event_${Date.now()}_${Math.round(Math.random() * 1E9)}`;
        cb(null, uniqueName + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const allowed = /jpeg|jpg|png|gif|webp/;
        const extValid = allowed.test(
            path.extname(file.originalname).toLowerCase()
        );
        const mimeValid = allowed.test(file.mimetype);
        if (extValid && mimeValid) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed.'));
        }
    }
});

// Public route - anyone can view events
router.get('/', eventController.getAllEvents);
router.get('/:id', eventController.getEventById);

// Admin routes
router.post(
    '/',
    authenticate, requireAdmin,
    upload.single('event_image'),
    eventController.createEvent
);

router.put(
    '/:id',
    authenticate, requireAdmin,
    upload.single('event_image'),
    eventController.updateEvent
);

router.delete(
    '/:id',
    authenticate, requireAdmin,
    eventController.deleteEvent
);

router.get(
    '/:id/participants',
    authenticate, requireAdmin,
    eventController.getEventParticipants
);

module.exports = router;