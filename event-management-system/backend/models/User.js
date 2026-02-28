// backend/models/User.js

const db = require('../config/database');
const bcrypt = require('bcryptjs');

// ============================================
// USER MODEL
// Handles all database operations for users
// ============================================
class User {

    // ========================================
    // CREATE NEW USER
    // ========================================
    static async create(userData) {
        try {
            const {
                name,
                email,
                password,
                role = 'student',
                course = null,
                year_level = null,
                gender = null
            } = userData;

            // Hash password before storing
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            const [result] = await db.execute(
                `INSERT INTO users
                    (name, email, password, role, course, year_level, gender)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [name, email, hashedPassword, role, course, year_level, gender]
            );

            return {
                user_id: result.insertId,
                name,
                email,
                role,
                course,
                year_level,
                gender
            };
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                throw new Error('Email already registered.');
            }
            throw error;
        }
    }

    // ========================================
    // FIND USER BY ID
    // ========================================
    static async findById(userId) {
        const [rows] = await db.execute(
            `SELECT
                user_id, name, email, role,
                course, year_level, gender,
                profile_image, is_active,
                created_at, updated_at
             FROM users
             WHERE user_id = ? AND is_active = 1`,
            [userId]
        );

        return rows.length > 0 ? rows[0] : null;
    }

    // ========================================
    // FIND USER BY EMAIL
    // ========================================
    static async findByEmail(email) {
        const [rows] = await db.execute(
            `SELECT *
             FROM users
             WHERE email = ? AND is_active = 1`,
            [email]
        );

        return rows.length > 0 ? rows[0] : null;
    }

    // ========================================
    // VERIFY PASSWORD
    // ========================================
    static async verifyPassword(plainPassword, hashedPassword) {
        return await bcrypt.compare(plainPassword, hashedPassword);
    }

    // ========================================
    // UPDATE USER PROFILE
    // ========================================
    static async update(userId, updateData) {
        const {
            name,
            course,
            year_level,
            gender,
            profile_image
        } = updateData;

        const fields = [];
        const values = [];

        if (name !== undefined) {
            fields.push('name = ?');
            values.push(name);
        }
        if (course !== undefined) {
            fields.push('course = ?');
            values.push(course);
        }
        if (year_level !== undefined) {
            fields.push('year_level = ?');
            values.push(year_level);
        }
        if (gender !== undefined) {
            fields.push('gender = ?');
            values.push(gender);
        }
        if (profile_image !== undefined) {
            fields.push('profile_image = ?');
            values.push(profile_image);
        }

        if (fields.length === 0) {
            throw new Error('No fields to update.');
        }

        values.push(userId);

        const [result] = await db.execute(
            `UPDATE users SET ${fields.join(', ')} WHERE user_id = ?`,
            values
        );

        return result.affectedRows > 0;
    }

    // ========================================
    // CHANGE PASSWORD
    // ========================================
    static async changePassword(userId, oldPassword, newPassword) {
        // Get current password hash
        const [rows] = await db.execute(
            'SELECT password FROM users WHERE user_id = ?',
            [userId]
        );

        if (rows.length === 0) {
            throw new Error('User not found.');
        }

        // Verify old password
        const isMatch = await bcrypt.compare(oldPassword, rows[0].password);
        if (!isMatch) {
            throw new Error('Current password is incorrect.');
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        const [result] = await db.execute(
            'UPDATE users SET password = ? WHERE user_id = ?',
            [hashedPassword, userId]
        );

        return result.affectedRows > 0;
    }

    // ========================================
    // GET ALL USERS (Admin)
    // ========================================
    static async findAll(filters = {}) {
        const {
            role,
            search,
            course,
            year_level,
            page = 1,
            limit = 20
        } = filters;

        const offset = (page - 1) * limit;

        let query = `
            SELECT
                user_id, name, email, role,
                course, year_level, gender,
                is_active, created_at
            FROM users
            WHERE 1=1
        `;
        const params = [];

        if (role) {
            query += ' AND role = ?';
            params.push(role);
        }

        if (search) {
            query += ' AND (name LIKE ? OR email LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }

        if (course) {
            query += ' AND course = ?';
            params.push(course);
        }

        if (year_level) {
            query += ' AND year_level = ?';
            params.push(year_level);
        }

        // Get total count
        const countQuery = query.replace(
            /SELECT[\s\S]*?FROM/,
            'SELECT COUNT(*) as total FROM'
        );
        const [countResult] = await db.execute(countQuery, params);
        const total = countResult[0].total;

        // Add pagination
        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const [rows] = await db.execute(query, params);

        return {
            users: rows,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    // ========================================
    // GET TOTAL STUDENT COUNT
    // ========================================
    static async getStudentCount() {
        const [rows] = await db.execute(
            "SELECT COUNT(*) as count FROM users WHERE role = 'student' AND is_active = 1"
        );
        return rows[0].count;
    }

    // ========================================
    // DEACTIVATE USER (Soft Delete)
    // ========================================
    static async deactivate(userId) {
        const [result] = await db.execute(
            'UPDATE users SET is_active = 0 WHERE user_id = ?',
            [userId]
        );
        return result.affectedRows > 0;
    }

    // ========================================
    // REACTIVATE USER
    // ========================================
    static async reactivate(userId) {
        const [result] = await db.execute(
            'UPDATE users SET is_active = 1 WHERE user_id = ?',
            [userId]
        );
        return result.affectedRows > 0;
    }

    // ========================================
    // CHECK IF EMAIL EXISTS
    // ========================================
    static async emailExists(email) {
        const [rows] = await db.execute(
            'SELECT user_id FROM users WHERE email = ?',
            [email]
        );
        return rows.length > 0;
    }

    // ========================================
    // GET USER EVENT HISTORY
    // ========================================
    static async getEventHistory(userId) {
        const [rows] = await db.execute(
            `SELECT
                e.event_id,
                e.title,
                e.event_date,
                e.location,
                e.category,
                e.status AS event_status,
                r.registration_date,
                r.attendance_status,
                r.attendance_time,
                c.certificate_id,
                c.certificate_code,
                c.file_path AS certificate_path
             FROM registrations r
             JOIN events e ON r.event_id = e.event_id
             LEFT JOIN certificates c
                 ON c.user_id = r.user_id AND c.event_id = r.event_id
             WHERE r.user_id = ?
             ORDER BY e.event_date DESC`,
            [userId]
        );

        return rows;
    }
}

module.exports = User;