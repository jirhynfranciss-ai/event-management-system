// backend/controllers/attendanceController.js

const db = require('../config/database');

const attendanceController = {
    // ========================================
    // MARK ATTENDANCE MANUALLY (Admin)
    // ========================================
    markAttendance: async (req, res) => {
        try {
            const { registration_id, status } = req.body;

            if (!['present', 'absent'].includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: 'Status must be "present" or "absent".'
                });
            }

            const attendance_time = status === 'present'
                ? new Date()
                : null;

            const [result] = await db.execute(
                `UPDATE registrations
                 SET attendance_status = ?,
                     attendance_time = ?,
                     check_in_method = 'manual'
                 WHERE registration_id = ?`,
                [status, attendance_time, registration_id]
            );

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Registration not found.'
                });
            }

            res.json({
                success: true,
                message: `Attendance marked as ${status}.`
            });

        } catch (error) {
            console.error('Mark attendance error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to mark attendance.'
            });
        }
    },

    // ========================================
    // BULK MARK ATTENDANCE (Admin)
    // ========================================
    bulkMarkAttendance: async (req, res) => {
        try {
            const { event_id, attendees } = req.body;
            // attendees = [{ registration_id, status }]

            if (!Array.isArray(attendees) || attendees.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Attendees list is required.'
                });
            }

            let updated = 0;

            for (const attendee of attendees) {
                const attendance_time = attendee.status === 'present'
                    ? new Date()
                    : null;

                const [result] = await db.execute(
                    `UPDATE registrations
                     SET attendance_status = ?,
                         attendance_time = ?,
                         check_in_method = 'manual'
                     WHERE registration_id = ? AND event_id = ?`,
                    [attendee.status, attendance_time,
                     attendee.registration_id, event_id]
                );
                updated += result.affectedRows;
            }

            res.json({
                success: true,
                message: `${updated} attendance record(s) updated.`
            });

        } catch (error) {
            console.error('Bulk attendance error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update attendance.'
            });
        }
    },

    // ========================================
    // QR CODE CHECK-IN (Advanced Feature)
    // ========================================
    qrCheckIn: async (req, res) => {
        try {
            const { qr_data } = req.body;

            let parsedData;
            try {
                parsedData = JSON.parse(qr_data);
            } catch {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid QR code data.'
                });
            }

            const { user_id, event_id } = parsedData;

            // Find registration
            const [regs] = await db.execute(
                `SELECT r.*, e.title, e.status
                 FROM registrations r
                 JOIN events e ON r.event_id = e.event_id
                 WHERE r.user_id = ? AND r.event_id = ?`,
                [user_id, event_id]
            );

            if (regs.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Registration not found for this QR code.'
                });
            }

            const reg = regs[0];

            if (reg.attendance_status === 'present') {
                return res.status(400).json({
                    success: false,
                    message: 'Attendance already recorded.'
                });
            }

            // Update attendance
            await db.execute(
                `UPDATE registrations
                 SET attendance_status = 'present',
                     attendance_time = NOW(),
                     check_in_method = 'qr_code'
                 WHERE registration_id = ?`,
                [reg.registration_id]
            );

            // Get user name for response
            const [users] = await db.execute(
                'SELECT name FROM users WHERE user_id = ?',
                [user_id]
            );

            res.json({
                success: true,
                message: `Check-in successful!`,
                data: {
                    student_name: users[0]?.name,
                    event_title: reg.title,
                    check_in_time: new Date().toISOString()
                }
            });

        } catch (error) {
            console.error('QR check-in error:', error);
            res.status(500).json({
                success: false,
                message: 'QR check-in failed.'
            });
        }
    },

    // ========================================
    // GET ATTENDANCE LOG FOR EVENT
    // ========================================
    getAttendanceLog: async (req, res) => {
        try {
            const { event_id } = req.params;

            const [logs] = await db.execute(
                `SELECT
                    r.registration_id,
                    r.attendance_status,
                    r.attendance_time,
                    r.check_in_method,
                    u.user_id,
                    u.name,
                    u.email,
                    u.course,
                    u.year_level
                 FROM registrations r
                 JOIN users u ON r.user_id = u.user_id
                 WHERE r.event_id = ?
                 ORDER BY r.attendance_time ASC`,
                [event_id]
            );

            const summary = {
                total_registered: logs.length,
                total_present: logs.filter(
                    l => l.attendance_status === 'present'
                ).length,
                total_absent: logs.filter(
                    l => l.attendance_status === 'absent'
                ).length,
                pending: logs.filter(
                    l => l.attendance_status === 'registered'
                ).length
            };

            res.json({
                success: true,
                data: logs,
                summary
            });

        } catch (error) {
            console.error('Attendance log error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch attendance log.'
            });
        }
    }
};

module.exports = attendanceController;