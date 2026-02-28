// backend/controllers/eventController.js

const db = require('../config/database');
const path = require('path');
const fs = require('fs');

const eventController = {
    // ========================================
    // CREATE NEW EVENT (Admin)
    // ========================================
    createEvent: async (req, res) => {
        try {
            const {
                title, description, event_date, start_time, end_time,
                location, speaker, organizer, max_participants,
                registration_deadline, category
            } = req.body;

            // Validate required fields
            if (!title || !event_date || !start_time || !end_time
                || !location || !registration_deadline) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required fields.'
                });
            }

            const event_image = req.file
                ? `/uploads/${req.file.filename}`
                : null;

            const [result] = await db.execute(
                `INSERT INTO events
                 (title, description, event_date, start_time, end_time,
                  location, speaker, organizer, max_participants,
                  event_image, registration_deadline, category, created_by)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    title,
                    description || null,
                    event_date,
                    start_time,
                    end_time,
                    location,
                    speaker || null,
                    organizer || null,
                    max_participants || 100,
                    event_image,
                    registration_deadline,
                    category || 'Other',
                    req.user.user_id
                ]
            );

            // Log activity
            await db.execute(
                `INSERT INTO activity_logs (user_id, action, description)
                 VALUES (?, 'CREATE_EVENT', ?)`,
                [req.user.user_id, `Created event: ${title}`]
            );

            res.status(201).json({
                success: true,
                message: 'Event created successfully!',
                data: { event_id: result.insertId, title }
            });

        } catch (error) {
            console.error('Create event error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create event.',
                error: error.message
            });
        }
    },

    // ========================================
    // GET ALL EVENTS (with filters)
    // ========================================
    getAllEvents: async (req, res) => {
        try {
            const {
                status, category, search, page = 1, limit = 10
            } = req.query;
            const offset = (page - 1) * limit;

            let query = `
                SELECT e.*, u.name as creator_name,
                       (e.max_participants - e.current_participants) AS slots_available
                FROM events e
                JOIN users u ON e.created_by = u.user_id
                WHERE 1=1
            `;
            const params = [];

            if (status) {
                query += ' AND e.status = ?';
                params.push(status);
            }

            if (category) {
                query += ' AND e.category = ?';
                params.push(category);
            }

            if (search) {
                query += ' AND (e.title LIKE ? OR e.description LIKE ?)';
                params.push(`%${search}%`, `%${search}%`);
            }

            // Get total count
            const countQuery = query.replace(
                /SELECT .* FROM/,
                'SELECT COUNT(*) as total FROM'
            );
            const [countResult] = await db.execute(countQuery, params);
            const total = countResult[0].total;

            // Add ordering and pagination
            query += ' ORDER BY e.event_date ASC, e.start_time ASC LIMIT ? OFFSET ?';
            params.push(parseInt(limit), parseInt(offset));

            const [events] = await db.execute(query, params);

            res.json({
                success: true,
                data: events,
                pagination: {
                    total,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    totalPages: Math.ceil(total / limit)
                }
            });

        } catch (error) {
            console.error('Fetch events error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch events.'
            });
        }
    },

    // ========================================
    // GET SINGLE EVENT BY ID
    // ========================================
    getEventById: async (req, res) => {
        try {
            const { id } = req.params;

            const [events] = await db.execute(
                `SELECT e.*, u.name as creator_name,
                        (e.max_participants - e.current_participants) AS slots_available
                 FROM events e
                 JOIN users u ON e.created_by = u.user_id
                 WHERE e.event_id = ?`,
                [id]
            );

            if (events.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Event not found.'
                });
            }

            // Get registered participants count
            const [regCount] = await db.execute(
                `SELECT
                    COUNT(*) as total_registered,
                    SUM(CASE WHEN attendance_status = 'present' THEN 1 ELSE 0 END)
                        AS total_present
                 FROM registrations WHERE event_id = ?`,
                [id]
            );

            const eventData = {
                ...events[0],
                total_registered: regCount[0].total_registered,
                total_present: regCount[0].total_present || 0
            };

            res.json({
                success: true,
                data: eventData
            });

        } catch (error) {
            console.error('Fetch event error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch event.'
            });
        }
    },

    // ========================================
    // UPDATE EVENT (Admin)
    // ========================================
    updateEvent: async (req, res) => {
        try {
            const { id } = req.params;
            const {
                title, description, event_date, start_time, end_time,
                location, speaker, organizer, max_participants,
                registration_deadline, category, status
            } = req.body;

            const event_image = req.file
                ? `/uploads/${req.file.filename}`
                : undefined;

            let query = `
                UPDATE events SET
                    title = COALESCE(?, title),
                    description = COALESCE(?, description),
                    event_date = COALESCE(?, event_date),
                    start_time = COALESCE(?, start_time),
                    end_time = COALESCE(?, end_time),
                    location = COALESCE(?, location),
                    speaker = COALESCE(?, speaker),
                    organizer = COALESCE(?, organizer),
                    max_participants = COALESCE(?, max_participants),
                    registration_deadline = COALESCE(?, registration_deadline),
                    category = COALESCE(?, category),
                    status = COALESCE(?, status)
            `;

            const params = [
                title, description, event_date, start_time, end_time,
                location, speaker, organizer, max_participants,
                registration_deadline, category, status
            ];

            if (event_image) {
                query += ', event_image = ?';
                params.push(event_image);
            }

            query += ' WHERE event_id = ?';
            params.push(id);

            const [result] = await db.execute(query, params);

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Event not found.'
                });
            }

            res.json({
                success: true,
                message: 'Event updated successfully!'
            });

        } catch (error) {
            console.error('Update event error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update event.'
            });
        }
    },

    // ========================================
    // DELETE EVENT (Admin)
    // ========================================
    deleteEvent: async (req, res) => {
        try {
            const { id } = req.params;

            // Check if event has registrations
            const [regs] = await db.execute(
                'SELECT COUNT(*) as count FROM registrations WHERE event_id = ?',
                [id]
            );

            const [result] = await db.execute(
                'DELETE FROM events WHERE event_id = ?',
                [id]
            );

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Event not found.'
                });
            }

            res.json({
                success: true,
                message: 'Event deleted successfully!',
                note: regs[0].count > 0
                    ? `${regs[0].count} registration(s) were also removed.`
                    : undefined
            });

        } catch (error) {
            console.error('Delete event error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete event.'
            });
        }
    },

    // ========================================
    // GET EVENT PARTICIPANTS (Admin)
    // ========================================
    getEventParticipants: async (req, res) => {
        try {
            const { id } = req.params;

            const [participants] = await db.execute(
                `SELECT
                    r.registration_id,
                    r.registration_date,
                    r.attendance_status,
                    r.attendance_time,
                    r.qr_code,
                    u.user_id,
                    u.name,
                    u.email,
                    u.course,
                    u.year_level,
                    u.gender
                 FROM registrations r
                 JOIN users u ON r.user_id = u.user_id
                 WHERE r.event_id = ?
                 ORDER BY r.registration_date ASC`,
                [id]
            );

            res.json({
                success: true,
                data: participants,
                total: participants.length
            });

        } catch (error) {
            console.error('Fetch participants error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch participants.'
            });
        }
    }
};

module.exports = eventController;