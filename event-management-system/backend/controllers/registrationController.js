// backend/controllers/registrationController.js

const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');

const registrationController = {
    // ========================================
    // REGISTER FOR AN EVENT (Student)
    // ========================================
    registerForEvent: async (req, res) => {
        try {
            const { event_id } = req.body;
            const user_id = req.user.user_id;

            // Check if event exists and is open
            const [events] = await db.execute(
                `SELECT * FROM events
                 WHERE event_id = ?
                   AND is_registration_open = 1
                   AND status = 'upcoming'
                   AND registration_deadline > NOW()`,
                [event_id]
            );

            if (events.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Event not found, registration closed, or deadline passed.'
                });
            }

            const event = events[0];

            // Check if event is full
            if (event.current_participants >= event.max_participants) {
                return res.status(400).json({
                    success: false,
                    message: 'Event is already full.'
                });
            }

            // Check for duplicate registration
            const [existing] = await db.execute(
                `SELECT registration_id FROM registrations
                 WHERE user_id = ? AND event_id = ?`,
                [user_id, event_id]
            );

            if (existing.length > 0) {
                return res.status(409).json({
                    success: false,
                    message: 'You are already registered for this event.'
                });
            }

            // Generate unique QR code for attendance
            const qrData = JSON.stringify({
                registration_id: uuidv4(),
                user_id,
                event_id,
                timestamp: Date.now()
            });

            const qrFileName = `qr_${user_id}_${event_id}_${Date.now()}.png`;
            const qrPath = path.join(__dirname, '../uploads/qrcodes', qrFileName);

            // Ensure qrcodes directory exists
            const qrDir = path.join(__dirname, '../uploads/qrcodes');
            if (!fs.existsSync(qrDir)) {
                fs.mkdirSync(qrDir, { recursive: true });
            }

            await QRCode.toFile(qrPath, qrData);

            // Insert registration
            const [result] = await db.execute(
                `INSERT INTO registrations (user_id, event_id, qr_code)
                 VALUES (?, ?, ?)`,
                [user_id, event_id, `/uploads/qrcodes/${qrFileName}`]
            );

            // Log activity
            await db.execute(
                `INSERT INTO activity_logs (user_id, action, description)
                 VALUES (?, 'REGISTER_EVENT', ?)`,
                [user_id, `Registered for event: ${event.title}`]
            );

            res.status(201).json({
                success: true,
                message: `Successfully registered for "${event.title}"!`,
                data: {
                    registration_id: result.insertId,
                    event_title: event.title,
                    event_date: event.event_date,
                    qr_code: `/uploads/qrcodes/${qrFileName}`
                }
            });

        } catch (error) {
            console.error('Registration error:', error);
            res.status(500).json({
                success: false,
                message: 'Registration failed.',
                error: error.message
            });
        }
    },

    // ========================================
    // CANCEL REGISTRATION (Student)
    // ========================================
    cancelRegistration: async (req, res) => {
        try {
            const { registration_id } = req.params;
            const user_id = req.user.user_id;

            // Verify ownership
            const [regs] = await db.execute(
                `SELECT r.*, e.title, e.status FROM registrations r
                 JOIN events e ON r.event_id = e.event_id
                 WHERE r.registration_id = ? AND r.user_id = ?`,
                [registration_id, user_id]
            );

            if (regs.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Registration not found.'
                });
            }

            if (regs[0].status !== 'upcoming') {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot cancel registration for past or ongoing events.'
                });
            }

            await db.execute(
                'DELETE FROM registrations WHERE registration_id = ? AND user_id = ?',
                [registration_id, user_id]
            );

            res.json({
                success: true,
                message: `Registration for "${regs[0].title}" cancelled successfully.`
            });

        } catch (error) {
            console.error('Cancel registration error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to cancel registration.'
            });
        }
    },

    // ========================================
    // GET MY REGISTRATIONS (Student)
    // ========================================
    getMyRegistrations: async (req, res) => {
        try {
            const user_id = req.user.user_id;

            const [registrations] = await db.execute(
                `SELECT
                    r.registration_id,
                    r.registration_date,
                    r.attendance_status,
                    r.attendance_time,
                    r.qr_code,
                    e.event_id,
                    e.title,
                    e.description,
                    e.event_date,
                    e.start_time,
                    e.end_time,
                    e.location,
                    e.speaker,
                    e.organizer,
                    e.category,
                    e.status AS event_status,
                    e.event_image,
                    c.certificate_id,
                    c.file_path AS certificate_path
                 FROM registrations r
                 JOIN events e ON r.event_id = e.event_id
                 LEFT JOIN certificates c
                     ON c.user_id = r.user_id AND c.event_id = r.event_id
                 WHERE r.user_id = ?
                 ORDER BY e.event_date DESC`,
                [user_id]
            );

            res.json({
                success: true,
                data: registrations
            });

        } catch (error) {
            console.error('Fetch registrations error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch registrations.'
            });
        }
    },

    // ========================================
    // CHECK REGISTRATION STATUS
    // ========================================
    checkRegistration: async (req, res) => {
        try {
            const { event_id } = req.params;
            const user_id = req.user.user_id;

            const [regs] = await db.execute(
                `SELECT registration_id, attendance_status, qr_code
                 FROM registrations
                 WHERE user_id = ? AND event_id = ?`,
                [user_id, event_id]
            );

            res.json({
                success: true,
                is_registered: regs.length > 0,
                data: regs.length > 0 ? regs[0] : null
            });

        } catch (error) {
            console.error('Check registration error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to check registration status.'
            });
        }
    }
};

module.exports = registrationController;