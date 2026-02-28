// backend/middleware/auth.js

const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'event_mgmt_secret_key_2024';

// ============================================
// Verify JWT Token
// ============================================
const authenticate = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Access denied. No token provided.'
            });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);

        req.user = decoded;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token expired. Please login again.'
            });
        }
        return res.status(403).json({
            success: false,
            message: 'Invalid token.'
        });
    }
};

// ============================================
// Check Admin Role
// ============================================
const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Admin privileges required.'
        });
    }
    next();
};

// ============================================
// Check Student Role
// ============================================
const requireStudent = (req, res, next) => {
    if (req.user.role !== 'student') {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Student account required.'
        });
    }
    next();
};

// ============================================
// Generate JWT Token
// ============================================
const generateToken = (user) => {
    return jwt.sign(
        {
            user_id: user.user_id,
            email: user.email,
            role: user.role,
            name: user.name
        },
        JWT_SECRET,
        { expiresIn: '24h' }
    );
};

module.exports = {
    authenticate,
    requireAdmin,
    requireStudent,
    generateToken,
    JWT_SECRET
};