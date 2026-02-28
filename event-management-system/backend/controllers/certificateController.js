// backend/controllers/certificateController.js

const db = require('../config/database');
const { generateCertificatePDF } = require('../utils/pdfGenerator');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

const certificateController = {
    // ========================================
    // GENERATE CERTIFICATE (After Attendance)
    // ========================================
    generateCertificate: async (req, res) => {
        try {
            const { user_id, event_id } = req.body;

            // Verify attendance
            const [regs] = await db.execute(
                `SELECT r.*, u.name AS student_name, u.email,
                        e.title AS event_title, e.event_date,
                        e.organizer, e.speaker
                 FROM registrations r
                 JOIN users u ON r.user_id = u.user_id
                 JOIN events e ON r.event_id = e.event_id
                 WHERE r.user_id = ? AND r.event_id = ?
                   AND r.attendance_status = 'present'`,
                [user_id, event_id]
            );

            if (regs.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'No confirmed attendance found. Certificate cannot be generated.'
                });
            }

            // Check if certificate already exists
            const [existingCert] = await db.execute(
                `SELECT * FROM certificates
                 WHERE user_id = ? AND event_id = ?`,
                [user_id, event_id]
            );

            if (existingCert.length > 0) {
                return res.json({
                    success: true,
                    message: 'Certificate already generated.',
                    data: existingCert[0]
                });
            }

            const reg = regs[0];
            const certificateCode = `CERT-${uuidv4().substring(0, 8).toUpperCase()}`;
            const fileName = `certificate_${user_id}_${event_id}_${Date.now()}.pdf`;
            const filePath = path.join(__dirname, '../certificates', fileName);

            // Ensure certificates directory exists
            const certDir = path.join(__dirname, '../certificates');
            if (!fs.existsSync(certDir)) {
                fs.mkdirSync(certDir, { recursive: true });
            }

            // Generate PDF certificate
            await generateCertificatePDF({
                studentName: reg.student_name,
                eventTitle: reg.event_title,
                eventDate: reg.event_date,
                organizer: reg.organizer,
                speaker: reg.speaker,
                certificateCode,
                filePath
            });

            // Save certificate record
            const [result] = await db.execute(
                `INSERT INTO certificates
                 (user_id, event_id, certificate_code, file_path)
                 VALUES (?, ?, ?, ?)`,
                [user_id, event_id, certificateCode, `/certificates/${fileName}`]
            );

            // Log activity
            await db.execute(
                `INSERT INTO activity_logs (user_id, action, description)
                 VALUES (?, 'GENERATE_CERTIFICATE', ?)`,
                [
                    req.user.user_id,
                    `Certificate generated for ${reg.student_name} - ${reg.event_title}`
                ]
            );

            res.status(201).json({
                success: true,
                message: 'Certificate generated successfully!',
                data: {
                    certificate_id: result.insertId,
                    certificate_code: certificateCode,
                    file_path: `/certificates/${fileName}`,
                    student_name: reg.student_name,
                    event_title: reg.event_title
                }
            });

        } catch (error) {
            console.error('Generate certificate error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to generate certificate.',
                error: error.message
            });
        }
    },

    // ========================================
    // BULK GENERATE CERTIFICATES (Admin)
    // ========================================
    bulkGenerateCertificates: async (req, res) => {
        try {
            const { event_id } = req.body;

            // Get all attendees who haven't received certificates
            const [attendees] = await db.execute(
                `SELECT r.user_id, u.name AS student_name,
                        e.title AS event_title, e.event_date,
                        e.organizer, e.speaker
                 FROM registrations r
                 JOIN users u ON r.user_id = u.user_id
                 JOIN events e ON r.event_id = e.event_id
                 LEFT JOIN certificates c
                     ON c.user_id = r.user_id AND c.event_id = r.event_id
                 WHERE r.event_id = ?
                   AND r.attendance_status = 'present'
                   AND c.certificate_id IS NULL`,
                [event_id]
            );

            if (attendees.length === 0) {
                return res.json({
                    success: true,
                    message: 'No pending certificates to generate.'
                });
            }

            const certDir = path.join(__dirname, '../certificates');
            if (!fs.existsSync(certDir)) {
                fs.mkdirSync(certDir, { recursive: true });
            }

            let generated = 0;

            for (const attendee of attendees) {
                const certificateCode =
                    `CERT-${uuidv4().substring(0, 8).toUpperCase()}`;
                const fileName =
                    `certificate_${attendee.user_id}_${event_id}_${Date.now()}.pdf`;
                const filePath = path.join(certDir, fileName);

                await generateCertificatePDF({
                    studentName: attendee.student_name,
                    eventTitle: attendee.event_title,
                    eventDate: attendee.event_date,
                    organizer: attendee.organizer,
                    speaker: attendee.speaker,
                    certificateCode,
                    filePath
                });

                await db.execute(
                    `INSERT INTO certificates
                     (user_id, event_id, certificate_code, file_path)
                     VALUES (?, ?, ?, ?)`,
                    [
                        attendee.user_id,
                        event_id,
                        certificateCode,
                        `/certificates/${fileName}`
                    ]
                );

                generated++;
            }

            res.json({
                success: true,
                message: `${generated} certificate(s) generated successfully!`
            });

        } catch (error) {
            console.error('Bulk certificate error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to generate certificates.'
            });
        }
    },

    // ========================================
    // DOWNLOAD CERTIFICATE (Student)
    // ========================================
    downloadCertificate: async (req, res) => {
        try {
            const { certificate_id } = req.params;
            const user_id = req.user.user_id;

            let query = `SELECT * FROM certificates WHERE certificate_id = ?`;
            const params = [certificate_id];

            // Students can only download their own
            if (req.user.role === 'student') {
                query += ' AND user_id = ?';
                params.push(user_id);
            }

            const [certs] = await db.execute(query, params);

            if (certs.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Certificate not found.'
                });
            }

            const certPath = path.join(__dirname, '..', certs[0].file_path);

            if (!fs.existsSync(certPath)) {
                return res.status(404).json({
                    success: false,
                    message: 'Certificate file not found on server.'
                });
            }

            res.download(certPath);

        } catch (error) {
            console.error('Download certificate error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to download certificate.'
            });
        }
    },

    // ========================================
    // GET MY CERTIFICATES (Student)
    // ========================================
    getMyCertificates: async (req, res) => {
        try {
            const user_id = req.user.user_id;

            const [certificates] = await db.execute(
                `SELECT c.*, e.title AS event_title,
                        e.event_date, e.organizer
                 FROM certificates c
                 JOIN events e ON c.event_id = e.event_id
                 WHERE c.user_id = ?
                 ORDER BY c.generated_date DESC`,
                [user_id]
            );

            res.json({
                success: true,
                data: certificates
            });

        } catch (error) {
            console.error('Fetch certificates error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch certificates.'
            });
        }
    },

    // ========================================
    // VERIFY CERTIFICATE (Public)
    // ========================================
    verifyCertificate: async (req, res) => {
        try {
            const { code } = req.params;

            const [certs] = await db.execute(
                `SELECT c.*, u.name AS student_name, u.email,
                        e.title AS event_title, e.event_date, e.organizer
                 FROM certificates c
                 JOIN users u ON c.user_id = u.user_id
                 JOIN events e ON c.event_id = e.event_id
                 WHERE c.certificate_code = ?`,
                [code]
            );

            if (certs.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Certificate not found. Invalid code.'
                });
            }

            res.json({
                success: true,
                message: 'Certificate is valid!',
                data: {
                    student_name: certs[0].student_name,
                    event_title: certs[0].event_title,
                    event_date: certs[0].event_date,
                    organizer: certs[0].organizer,
                    generated_date: certs[0].generated_date,
                    certificate_code: certs[0].certificate_code
                }
            });

        } catch (error) {
            console.error('Verify certificate error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to verify certificate.'
            });
        }
    }
};

module.exports = certificateController;