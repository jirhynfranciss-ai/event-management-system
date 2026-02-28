// backend/controllers/analyticsController.js

const db = require('../config/database');

const analyticsController = {
    // ========================================
    // DASHBOARD OVERVIEW (Admin)
    // ========================================
    getDashboard: async (req, res) => {
        try {
            // Total counts
            const [totalEvents] = await db.execute(
                'SELECT COUNT(*) as count FROM events'
            );
            const [totalUsers] = await db.execute(
                "SELECT COUNT(*) as count FROM users WHERE role = 'student'"
            );
            const [totalRegistrations] = await db.execute(
                'SELECT COUNT(*) as count FROM registrations'
            );
            const [totalCertificates] = await db.execute(
                'SELECT COUNT(*) as count FROM certificates'
            );

            // Events by status
            const [eventsByStatus] = await db.execute(
                `SELECT status, COUNT(*) as count
                 FROM events GROUP BY status`
            );

            // Upcoming events
            const [upcomingEvents] = await db.execute(
                `SELECT event_id, title, event_date, current_participants,
                        max_participants
                 FROM events
                 WHERE status = 'upcoming' AND event_date >= CURDATE()
                 ORDER BY event_date ASC
                 LIMIT 5`
            );

            // Recent registrations
            const [recentRegistrations] = await db.execute(
                `SELECT r.registration_id, r.registration_date,
                        u.name AS student_name, e.title AS event_title
                 FROM registrations r
                 JOIN users u ON r.user_id = u.user_id
                 JOIN events e ON r.event_id = e.event_id
                 ORDER BY r.registration_date DESC
                 LIMIT 10`
            );

            res.json({
                success: true,
                data: {
                    overview: {
                        total_events: totalEvents[0].count,
                        total_students: totalUsers[0].count,
                        total_registrations: totalRegistrations[0].count,
                        total_certificates: totalCertificates[0].count
                    },
                    events_by_status: eventsByStatus,
                    upcoming_events: upcomingEvents,
                    recent_registrations: recentRegistrations
                }
            });

        } catch (error) {
            console.error('Dashboard error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch dashboard data.'
            });
        }
    },

    // ========================================
    // EVENT ANALYTICS (Admin)
    // ========================================
    getEventAnalytics: async (req, res) => {
        try {
            const { event_id } = req.params;

            // Event details
            const [events] = await db.execute(
                'SELECT * FROM events WHERE event_id = ?',
                [event_id]
            );

            if (events.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Event not found.'
                });
            }

            // Registration & attendance stats
            const [stats] = await db.execute(
                `SELECT
                    COUNT(*) AS total_registered,
                    SUM(CASE WHEN attendance_status = 'present'
                        THEN 1 ELSE 0 END) AS total_present,
                    SUM(CASE WHEN attendance_status = 'absent'
                        THEN 1 ELSE 0 END) AS total_absent,
                    SUM(CASE WHEN attendance_status = 'registered'
                        THEN 1 ELSE 0 END) AS pending
                 FROM registrations
                 WHERE event_id = ?`,
                [event_id]
            );

            // Gender distribution
            const [genderDist] = await db.execute(
                `SELECT u.gender, COUNT(*) AS count
                 FROM registrations r
                 JOIN users u ON r.user_id = u.user_id
                 WHERE r.event_id = ?
                 GROUP BY u.gender`,
                [event_id]
            );

            // Course distribution
            const [courseDist] = await db.execute(
                `SELECT u.course, COUNT(*) AS count
                 FROM registrations r
                 JOIN users u ON r.user_id = u.user_id
                 WHERE r.event_id = ?
                 GROUP BY u.course`,
                [event_id]
            );

            // Year level distribution
            const [yearDist] = await db.execute(
                `SELECT u.year_level, COUNT(*) AS count
                 FROM registrations r
                 JOIN users u ON r.user_id = u.user_id
                 WHERE r.event_id = ?
                 GROUP BY u.year_level`,
                [event_id]
            );

            // Registration timeline
            const [timeline] = await db.execute(
                `SELECT DATE(registration_date) AS reg_date,
                        COUNT(*) AS count
                 FROM registrations
                 WHERE event_id = ?
                 GROUP BY DATE(registration_date)
                 ORDER BY reg_date`,
                [event_id]
            );

            const event = events[0];
            const stat = stats[0];
            const attendancePercentage = stat.total_registered > 0
                ? ((stat.total_present / stat.total_registered) * 100).toFixed(2)
                : 0;

            res.json({
                success: true,
                data: {
                    event: event,
                    statistics: {
                        ...stat,
                        attendance_percentage: parseFloat(attendancePercentage),
                        fill_rate: (
                            (event.current_participants / event.max_participants) * 100
                        ).toFixed(2)
                    },
                    gender_distribution: genderDist,
                    course_distribution: courseDist,
                    year_level_distribution: yearDist,
                    registration_timeline: timeline
                }
            });

        } catch (error) {
            console.error('Event analytics error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch event analytics.'
            });
        }
    },

    // ========================================
    // OVERALL ANALYTICS (Admin)
    // ========================================
    getOverallAnalytics: async (req, res) => {
        try {
            // Event popularity ranking
            const [popularEvents] = await db.execute(
                `SELECT e.event_id, e.title, e.category,
                        e.current_participants, e.max_participants,
                        COUNT(CASE WHEN r.attendance_status = 'present'
                              THEN 1 END) AS attendees,
                        ROUND(
                            COUNT(CASE WHEN r.attendance_status = 'present'
                                  THEN 1 END)
                            / NULLIF(e.current_participants, 0) * 100, 2
                        ) AS attendance_rate
                 FROM events e
                 LEFT JOIN registrations r ON e.event_id = r.event_id
                 GROUP BY e.event_id
                 ORDER BY e.current_participants DESC
                 LIMIT 10`
            );

            // Category distribution
            const [categoryDist] = await db.execute(
                `SELECT category, COUNT(*) AS count
                 FROM events GROUP BY category`
            );

            // Monthly event trend
            const [monthlyTrend] = await db.execute(
                `SELECT
                    DATE_FORMAT(event_date, '%Y-%m') AS month,
                    COUNT(*) AS event_count,
                    SUM(current_participants) AS total_participants
                 FROM events
                 GROUP BY DATE_FORMAT(event_date, '%Y-%m')
                 ORDER BY month DESC
                 LIMIT 12`
            );

            // Registration trend
            const [regTrend] = await db.execute(
                `SELECT
                    DATE_FORMAT(registration_date, '%Y-%m') AS month,
                    COUNT(*) AS registration_count
                 FROM registrations
                 GROUP BY DATE_FORMAT(registration_date, '%Y-%m')
                 ORDER BY month DESC
                 LIMIT 12`
            );

            res.json({
                success: true,
                data: {
                    popular_events: popularEvents,
                    category_distribution: categoryDist,
                    monthly_event_trend: monthlyTrend,
                    registration_trend: regTrend
                }
            });

        } catch (error) {
            console.error('Overall analytics error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch analytics.'
            });
        }
    }
};

module.exports = analyticsController;