-- database/schema.sql

-- ============================================
-- EVENT MANAGEMENT & REGISTRATION SYSTEM
-- MySQL Database Schema
-- ============================================

CREATE DATABASE IF NOT EXISTS event_management_system;
USE event_management_system;

-- ============================================
-- USERS TABLE
-- Stores admin and student accounts
-- ============================================
CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'student') DEFAULT 'student',
    course VARCHAR(100) DEFAULT NULL,
    year_level ENUM('1st', '2nd', '3rd', '4th', '5th') DEFAULT NULL,
    gender ENUM('Male', 'Female', 'Other') DEFAULT NULL,
    profile_image VARCHAR(255) DEFAULT NULL,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_email (email),
    INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- EVENTS TABLE
-- Stores all event information
-- ============================================
CREATE TABLE events (
    event_id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    event_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    location VARCHAR(200) NOT NULL,
    speaker VARCHAR(150) DEFAULT NULL,
    organizer VARCHAR(150) DEFAULT NULL,
    max_participants INT NOT NULL DEFAULT 100,
    current_participants INT DEFAULT 0,
    event_image VARCHAR(255) DEFAULT NULL,
    registration_deadline DATETIME NOT NULL,
    category ENUM(
        'Seminar', 'Workshop', 'Competition',
        'Academic', 'Cultural', 'Sports', 'Other'
    ) DEFAULT 'Other',
    status ENUM('upcoming', 'ongoing', 'completed', 'cancelled') DEFAULT 'upcoming',
    is_registration_open TINYINT(1) DEFAULT 1,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (created_by) REFERENCES users(user_id)
        ON DELETE CASCADE ON UPDATE CASCADE,

    INDEX idx_status (status),
    INDEX idx_event_date (event_date),
    INDEX idx_category (category),
    INDEX idx_registration_open (is_registration_open)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- REGISTRATIONS TABLE
-- Tracks student event registrations
-- ============================================
CREATE TABLE registrations (
    registration_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    event_id INT NOT NULL,
    registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    attendance_status ENUM('registered', 'present', 'absent') DEFAULT 'registered',
    attendance_time DATETIME DEFAULT NULL,
    qr_code VARCHAR(255) DEFAULT NULL,
    check_in_method ENUM('manual', 'qr_code') DEFAULT NULL,

    FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (event_id) REFERENCES events(event_id)
        ON DELETE CASCADE ON UPDATE CASCADE,

    -- Prevent duplicate registrations
    UNIQUE KEY unique_registration (user_id, event_id),

    INDEX idx_user_id (user_id),
    INDEX idx_event_id (event_id),
    INDEX idx_attendance (attendance_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- CERTIFICATES TABLE
-- Stores generated certificate records
-- ============================================
CREATE TABLE certificates (
    certificate_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    event_id INT NOT NULL,
    certificate_code VARCHAR(50) NOT NULL UNIQUE,
    file_path VARCHAR(255) NOT NULL,
    generated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (event_id) REFERENCES events(event_id)
        ON DELETE CASCADE ON UPDATE CASCADE,

    UNIQUE KEY unique_certificate (user_id, event_id),

    INDEX idx_certificate_code (certificate_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- ACTIVITY LOG TABLE (Optional - for tracking)
-- ============================================
CREATE TABLE activity_logs (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    action VARCHAR(100) NOT NULL,
    description TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-close registration when event is full
DELIMITER //
CREATE TRIGGER after_registration_insert
AFTER INSERT ON registrations
FOR EACH ROW
BEGIN
    UPDATE events
    SET current_participants = current_participants + 1
    WHERE event_id = NEW.event_id;

    -- Close registration if full
    UPDATE events
    SET is_registration_open = 0
    WHERE event_id = NEW.event_id
      AND current_participants >= max_participants;
END//
DELIMITER ;

-- Decrease participant count on registration delete
DELIMITER //
CREATE TRIGGER after_registration_delete
AFTER DELETE ON registrations
FOR EACH ROW
BEGIN
    UPDATE events
    SET current_participants = current_participants - 1
    WHERE event_id = OLD.event_id;

    -- Reopen registration if below max
    UPDATE events
    SET is_registration_open = 1
    WHERE event_id = OLD.event_id
      AND current_participants < max_participants
      AND registration_deadline > NOW()
      AND status = 'upcoming';
END//
DELIMITER ;

-- ============================================
-- VIEWS for Analytics
-- ============================================

-- Event summary view
CREATE VIEW event_summary AS
SELECT
    e.event_id,
    e.title,
    e.event_date,
    e.category,
    e.max_participants,
    e.current_participants,
    COUNT(CASE WHEN r.attendance_status = 'present' THEN 1 END) AS total_attendees,
    ROUND(
        COUNT(CASE WHEN r.attendance_status = 'present' THEN 1 END)
        / NULLIF(e.current_participants, 0) * 100, 2
    ) AS attendance_percentage,
    e.status
FROM events e
LEFT JOIN registrations r ON e.event_id = r.event_id
GROUP BY e.event_id;

-- Gender distribution view
CREATE VIEW gender_distribution AS
SELECT
    e.event_id,
    e.title,
    u.gender,
    COUNT(*) AS count
FROM registrations r
JOIN users u ON r.user_id = u.user_id
JOIN events e ON r.event_id = e.event_id
GROUP BY e.event_id, u.gender;

-- Course distribution view
CREATE VIEW course_distribution AS
SELECT
    e.event_id,
    e.title,
    u.course,
    COUNT(*) AS count
FROM registrations r
JOIN users u ON r.user_id = u.user_id
JOIN events e ON r.event_id = e.event_id
GROUP BY e.event_id, u.course;

-- ============================================
-- SEED DATA (Default Admin Account)
-- Password: admin123 (bcrypt hashed)
-- ============================================
INSERT INTO users (name, email, password, role, course, year_level, gender)
VALUES (
    'System Administrator',
    'admin@school.edu',
    '$2b$10$YourHashedPasswordHere',
    'admin',
    NULL,
    NULL,
    NULL
);

-- Sample students
INSERT INTO users (name, email, password, role, course, year_level, gender)
VALUES
    ('Juan Dela Cruz', 'juan@student.edu',
     '$2b$10$SampleHash', 'student', 'BSIT', '3rd', 'Male'),
    ('Maria Santos', 'maria@student.edu',
     '$2b$10$SampleHash', 'student', 'BSCS', '2nd', 'Female'),
    ('Pedro Reyes', 'pedro@student.edu',
     '$2b$10$SampleHash', 'student', 'BSIT', '4th', 'Male');

-- Sample events
INSERT INTO events (
    title, description, event_date, start_time, end_time,
    location, speaker, organizer, max_participants,
    registration_deadline, category, created_by
) VALUES
(
    'Web Development Workshop',
    'Learn modern web development with React and Node.js',
    DATE_ADD(CURDATE(), INTERVAL 7 DAY),
    '09:00:00', '16:00:00',
    'Computer Lab 1',
    'Prof. John Smith',
    'IT Department',
    50,
    DATE_ADD(NOW(), INTERVAL 5 DAY),
    'Workshop',
    1
),
(
    'Data Science Seminar',
    'Introduction to Data Science and Machine Learning',
    DATE_ADD(CURDATE(), INTERVAL 14 DAY),
    '13:00:00', '17:00:00',
    'Auditorium',
    'Dr. Jane Doe',
    'CS Department',
    100,
    DATE_ADD(NOW(), INTERVAL 12 DAY),
    'Seminar',
    1
);