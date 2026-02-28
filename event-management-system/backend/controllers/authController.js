// backend/controllers/authController.js

const bcrypt = require('bcryptjs');
const db = require('../config/database');
const { generateToken } = require('../middleware/auth');

const authController = {
    // ========================================
    // REGISTER NEW USER
    // ========================================
    register: async (req, res) => {
        try {
            const { name, email, password, role, course, year_level, gender } = req.body;

            // Validate required fields
            if (!name || !email || !password) {
                return res.status(400).json({
                    success: false,
                    message: 'Name, email, and password are required.'
                });
            }

            // Check email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid email format.'
                });
            }

            // Check password length
            if (password.length < 6) {
                return res.status(400).json({
                    success: false,
                    message: 'Password must be at least 6 characters.'
                });
            }

            // Check if email already exists
            const [existing] = await db.execute(
                'SELECT user_id FROM users WHERE email = ?',
                [email]
            );

            if (existing.length > 0) {
                return res.status(409).json({
                    success: false,
                    message: 'Email already registered.'
                });
            }

            // Hash password
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            // Insert new user
            const [result] = await db.execute(
                `INSERT INTO users (name, email, password, role, course, year_level, gender)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    name,
                    email,
                    hashedPassword,
                    role || 'student',
                    course || null,
                    year_level || null,
                    gender || null
                ]
            );

            // Generate token
            const user = {
                user_id: result.insertId,
                name,
                email,
                role: role || 'student'
            };

            const token = generateToken(user);

            res.status(201).json({
                success: true,
                message: 'Registration successful!',
                data: {
                    user_id: result.insertId,
                    name,
                    email,
                    role: role || 'student',
                    token
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
    // LOGIN USER
    // ========================================
    login: async (req, res) => {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                return res.status(400).json({
                    success: false,
                    message: 'Email and password are required.'
                });
            }

            // Find user by email
            const [users] = await db.execute(
                'SELECT * FROM users WHERE email = ? AND is_active = 1',
                [email]
            );

            if (users.length === 0) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid email or password.'
                });
            }

            const user = users[0];

            // Compare passwords
            const isMatch = await bcrypt.compare(password, user.password);

            if (!isMatch) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid email or password.'
                });
            }

            // Generate token
            const token = generateToken(user);

            // Log activity
            await db.execute(
                `INSERT INTO activity_logs (user_id, action, description)
                 VALUES (?, 'LOGIN', 'User logged in successfully')`,
                [user.user_id]
            );

            res.json({
                success: true,
                message: 'Login successful!',
                data: {
                    user_id: user.user_id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    course: user.course,
                    year_level: user.year_level,
                    token
                }
            });

        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({
                success: false,
                message: 'Login failed.',
                error: error.message
            });
        }
    },

    // ========================================
    // GET USER PROFILE
    // ========================================
    getProfile: async (req, res) => {
        try {
            const [users] = await db.execute(
                `SELECT user_id, name, email, role, course, year_level,
                        gender, profile_image, created_at
                 FROM users WHERE user_id = ?`,
                [req.user.user_id]
            );

            if (users.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found.'
                });
            }

            res.json({
                success: true,
                data: users[0]
            });

        } catch (error) {
            console.error('Profile fetch error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch profile.'
            });
        }
    },

    // ========================================
    // UPDATE USER PROFILE
    // ========================================
    updateProfile: async (req, res) => {
        try {
            const { name, course, year_level, gender } = req.body;

            await db.execute(
                `UPDATE users SET name = ?, course = ?, year_level = ?, gender = ?
                 WHERE user_id = ?`,
                [name, course, year_level, gender, req.user.user_id]
            );

            res.json({
                success: true,
                message: 'Profile updated successfully!'
            });

        } catch (error) {
            console.error('Profile update error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update profile.'
            });
        }
    }
};

module.exports = authController;