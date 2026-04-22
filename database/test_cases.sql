-- =========================================================
-- TriAttendanceDB Test Cases Data Pack - COMPREHENSIVE
-- Run AFTER schema.sql + seed.sql + hardening.sql
-- Tests all implemented features: Auth, QR attendance, 
-- manual marking, fine management, admin dashboards
-- =========================================================
USE TriAttendanceDB;

-- ---------------------------------------------------------
-- 1) ADDITIONAL TEST STUDENTS (BS-CS, BS-IT, BS-SE)
-- Password: 'password' (bcrypt hash)
-- ---------------------------------------------------------
INSERT INTO users (email, password, role, full_name, phone, registration_no, program_id, current_sem_id)
SELECT
    'zain.cs@student.com',
    '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy',
    'Student',
    'Zain Ahmed Khan',
    '03002222001',
    '2024-CS-003',
    p.program_id,
    s.sem_id
FROM programs p
JOIN semesters s ON s.program_id = p.program_id AND s.is_active = TRUE
WHERE p.program_code = 'BS-CS'
  AND NOT EXISTS (SELECT 1 FROM users WHERE email = 'zain.cs@student.com');

INSERT INTO users (email, password, role, full_name, phone, registration_no, program_id, current_sem_id)
SELECT
    'fatima.it@student.com',
    '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy',
    'Student',
    'Fatima Hassan Khan',
    '03002222002',
    '2024-IT-002',
    p.program_id,
    s.sem_id
FROM programs p
JOIN semesters s ON s.program_id = p.program_id AND s.is_active = TRUE
WHERE p.program_code = 'BS-IT'
  AND NOT EXISTS (SELECT 1 FROM users WHERE email = 'fatima.it@student.com');

INSERT INTO users (email, password, role, full_name, phone, registration_no, program_id, current_sem_id)
SELECT
    'sara.cs@student.com',
    '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy',
    'Student',
    'Sara Ali Malik',
    '03002222003',
    '2024-CS-004',
    p.program_id,
    s.sem_id
FROM programs p
JOIN semesters s ON s.program_id = p.program_id AND s.is_active = TRUE
WHERE p.program_code = 'BS-CS'
  AND NOT EXISTS (SELECT 1 FROM users WHERE email = 'sara.cs@student.com');

INSERT INTO users (email, password, role, full_name, phone, registration_no, program_id, current_sem_id)
SELECT
    'hassan.se@student.com',
    '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy',
    'Student',
    'Hassan Raza Malik',
    '03002222004',
    '2024-SE-001',
    p.program_id,
    s.sem_id
FROM programs p
JOIN semesters s ON s.program_id = p.program_id AND s.is_active = TRUE
WHERE p.program_code = 'BS-SE'
  AND NOT EXISTS (SELECT 1 FROM users WHERE email = 'hassan.se@student.com');

-- ---------------------------------------------------------
-- 2) STUDENT ENROLLMENTS
-- ---------------------------------------------------------

-- Zain: CS101-A
INSERT INTO student_enrollment (student_id, section_id)
SELECT u.user_id, sec.section_id
FROM users u
JOIN courses c ON c.course_code = 'CS101'
JOIN course_semester cs ON cs.course_id = c.course_id
JOIN sections sec ON sec.cs_id = cs.cs_id AND sec.section_code = 'A'
WHERE u.email = 'zain.cs@student.com'
  AND NOT EXISTS (
      SELECT 1 FROM student_enrollment se
      WHERE se.student_id = u.user_id AND se.section_id = sec.section_id
  );

-- Fatima: IT101-A
INSERT INTO student_enrollment (student_id, section_id)
SELECT u.user_id, sec.section_id
FROM users u
JOIN courses c ON c.course_code = 'IT101'
JOIN course_semester cs ON cs.course_id = c.course_id
JOIN sections sec ON sec.cs_id = cs.cs_id AND sec.section_code = 'A'
WHERE u.email = 'fatima.it@student.com'
  AND NOT EXISTS (
      SELECT 1 FROM student_enrollment se
      WHERE se.student_id = u.user_id AND se.section_id = sec.section_id
  );

-- Sara: CS102-A
INSERT INTO student_enrollment (student_id, section_id)
SELECT u.user_id, sec.section_id
FROM users u
JOIN courses c ON c.course_code = 'CS102'
JOIN course_semester cs ON cs.course_id = c.course_id
JOIN sections sec ON sec.cs_id = cs.cs_id AND sec.section_code = 'A'
WHERE u.email = 'sara.cs@student.com'
  AND NOT EXISTS (
      SELECT 1 FROM student_enrollment se
      WHERE se.student_id = u.user_id AND se.section_id = sec.section_id
  );

-- Hassan: SE101-A
INSERT INTO student_enrollment (student_id, section_id)
SELECT u.user_id, sec.section_id
FROM users u
JOIN courses c ON c.course_code = 'SE101'
JOIN course_semester cs ON cs.course_id = c.course_id
JOIN sections sec ON sec.cs_id = cs.cs_id AND sec.section_code = 'A'
WHERE u.email = 'hassan.se@student.com'
  AND NOT EXISTS (
      SELECT 1 FROM student_enrollment se
      WHERE se.student_id = u.user_id AND se.section_id = sec.section_id
  );

-- ---------------------------------------------------------
-- 3) ACTIVE SESSIONS FOR CURRENT TESTING (TODAY)
-- ---------------------------------------------------------

INSERT INTO attendance_sessions (section_id, teacher_id, session_date, start_time, session_token, mode, qr_code, qr_generated_at, is_active)
SELECT sec.section_id, sec.teacher_id, CURDATE(), NOW(), UUID(), 'Hybrid', NULL, NOW(), TRUE
FROM sections sec
JOIN course_semester cs ON cs.cs_id = sec.cs_id
JOIN courses c ON c.course_id = cs.course_id
WHERE c.course_code = 'CS101'
  AND sec.section_code = 'A'
  AND NOT EXISTS (
      SELECT 1 FROM attendance_sessions s
      WHERE s.section_id = sec.section_id AND s.session_date = CURDATE() AND s.is_active = TRUE
  );

INSERT INTO attendance_sessions (section_id, teacher_id, session_date, start_time, session_token, mode, qr_code, qr_generated_at, is_active)
SELECT sec.section_id, sec.teacher_id, CURDATE(), NOW(), UUID(), 'Hybrid', NULL, NOW(), TRUE
FROM sections sec
JOIN course_semester cs ON cs.cs_id = sec.cs_id
JOIN courses c ON c.course_id = cs.course_id
WHERE c.course_code = 'IT101'
  AND sec.section_code = 'A'
  AND NOT EXISTS (
      SELECT 1 FROM attendance_sessions s
      WHERE s.section_id = sec.section_id AND s.session_date = CURDATE() AND s.is_active = TRUE
  );

INSERT INTO attendance_sessions (section_id, teacher_id, session_date, start_time, session_token, mode, qr_code, qr_generated_at, is_active)
SELECT sec.section_id, sec.teacher_id, CURDATE(), NOW(), UUID(), 'Hybrid', NULL, NOW(), TRUE
FROM sections sec
JOIN course_semester cs ON cs.cs_id = sec.cs_id
JOIN courses c ON c.course_id = cs.course_id
WHERE c.course_code = 'CS102'
  AND sec.section_code = 'A'
  AND NOT EXISTS (
      SELECT 1 FROM attendance_sessions s
      WHERE s.section_id = sec.section_id AND s.session_date = CURDATE() AND s.is_active = TRUE
  );

INSERT INTO attendance_sessions (section_id, teacher_id, session_date, start_time, session_token, mode, qr_code, qr_generated_at, is_active)
SELECT sec.section_id, sec.teacher_id, CURDATE(), NOW(), UUID(), 'Hybrid', NULL, NOW(), TRUE
FROM sections sec
JOIN course_semester cs ON cs.cs_id = sec.cs_id
JOIN courses c ON c.course_id = cs.course_id
WHERE c.course_code = 'SE101'
  AND sec.section_code = 'A'
  AND NOT EXISTS (
      SELECT 1 FROM attendance_sessions s
      WHERE s.section_id = sec.section_id AND s.session_date = CURDATE() AND s.is_active = TRUE
  );

-- ---------------------------------------------------------
-- 4) CLOSED SESSIONS FROM PAST 30 DAYS
-- ---------------------------------------------------------

INSERT INTO attendance_sessions (section_id, teacher_id, session_date, start_time, end_time, session_token, mode, qr_code, qr_generated_at, is_active)
SELECT sec.section_id, sec.teacher_id, DATE_SUB(CURDATE(), INTERVAL d.day DAY), 
        CONCAT(DATE_SUB(CURDATE(), INTERVAL d.day DAY), ' 09:00:00'),
        CONCAT(DATE_SUB(CURDATE(), INTERVAL d.day DAY), ' 10:00:00'),
        UUID(), 'Hybrid', NULL, NOW(), FALSE
FROM sections sec
JOIN course_semester cs ON cs.cs_id = sec.cs_id
JOIN courses c ON c.course_id = cs.course_id
CROSS JOIN (SELECT 1 as day UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10) d
WHERE c.course_code = 'CS101'
  AND sec.section_code = 'A'
  AND NOT EXISTS (
      SELECT 1 FROM attendance_sessions s
      WHERE s.section_id = sec.section_id AND s.session_date = DATE_SUB(CURDATE(), INTERVAL d.day DAY)
  );

INSERT INTO attendance_sessions (section_id, teacher_id, session_date, start_time, end_time, session_token, mode, qr_code, qr_generated_at, is_active)
SELECT sec.section_id, sec.teacher_id, DATE_SUB(CURDATE(), INTERVAL d.day DAY),
        CONCAT(DATE_SUB(CURDATE(), INTERVAL d.day DAY), ' 11:00:00'),
        CONCAT(DATE_SUB(CURDATE(), INTERVAL d.day DAY), ' 12:00:00'),
        UUID(), 'Hybrid', NULL, NOW(), FALSE
FROM sections sec
JOIN course_semester cs ON cs.cs_id = sec.cs_id
JOIN courses c ON c.course_id = cs.course_id
CROSS JOIN (SELECT 1 as day UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8) d
WHERE c.course_code = 'IT101'
  AND sec.section_code = 'A'
  AND NOT EXISTS (
      SELECT 1 FROM attendance_sessions s
      WHERE s.section_id = sec.section_id AND s.session_date = DATE_SUB(CURDATE(), INTERVAL d.day DAY)
  );

INSERT INTO attendance_sessions (section_id, teacher_id, session_date, start_time, end_time, session_token, mode, qr_code, qr_generated_at, is_active)
SELECT sec.section_id, sec.teacher_id, DATE_SUB(CURDATE(), INTERVAL d.day DAY),
        CONCAT(DATE_SUB(CURDATE(), INTERVAL d.day DAY), ' 13:00:00'),
        CONCAT(DATE_SUB(CURDATE(), INTERVAL d.day DAY), ' 14:00:00'),
        UUID(), 'Hybrid', NULL, NOW(), FALSE
FROM sections sec
JOIN course_semester cs ON cs.cs_id = sec.cs_id
JOIN courses c ON c.course_id = cs.course_id
CROSS JOIN (SELECT 1 as day UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10) d
WHERE c.course_code = 'CS102'
  AND sec.section_code = 'A'
  AND NOT EXISTS (
      SELECT 1 FROM attendance_sessions s
      WHERE s.section_id = sec.section_id AND s.session_date = DATE_SUB(CURDATE(), INTERVAL d.day DAY)
  );

INSERT INTO attendance_sessions (section_id, teacher_id, session_date, start_time, end_time, session_token, mode, qr_code, qr_generated_at, is_active)
SELECT sec.section_id, sec.teacher_id, DATE_SUB(CURDATE(), INTERVAL d.day DAY),
        CONCAT(DATE_SUB(CURDATE(), INTERVAL d.day DAY), ' 15:00:00'),
        CONCAT(DATE_SUB(CURDATE(), INTERVAL d.day DAY), ' 16:00:00'),
        UUID(), 'Hybrid', NULL, NOW(), FALSE
FROM sections sec
JOIN course_semester cs ON cs.cs_id = sec.cs_id
JOIN courses c ON c.course_id = cs.course_id
CROSS JOIN (SELECT 1 as day UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10) d
WHERE c.course_code = 'SE101'
  AND sec.section_code = 'A'
  AND NOT EXISTS (
      SELECT 1 FROM attendance_sessions s
      WHERE s.section_id = sec.section_id AND s.session_date = DATE_SUB(CURDATE(), INTERVAL d.day DAY)
  );

-- ---------------------------------------------------------
-- 5) ATTENDANCE RECORDS - TEST VARIOUS SCENARIOS
-- Scenario 1: Zain (CS101-A) - LOW ATTENDANCE (~20%, 2/10)
-- ---------------------------------------------------------
INSERT INTO attendance_records (session_id, student_id, section_id, attendance_date, mode, status, sync_status, marked_at)
SELECT s.session_id, u.user_id, s.section_id, s.session_date, 'QR', 'Present', 'Synced', NOW()
FROM attendance_sessions s
JOIN users u ON u.email = 'zain.cs@student.com'
JOIN sections sec ON sec.section_id = s.section_id
JOIN course_semester cs ON cs.cs_id = sec.cs_id
JOIN courses c ON c.course_id = cs.course_id
WHERE c.course_code = 'CS101'
  AND sec.section_code = 'A'
  AND s.is_active = FALSE
  AND s.session_date IN (DATE_SUB(CURDATE(), INTERVAL 2 DAY), DATE_SUB(CURDATE(), INTERVAL 5 DAY))
  AND NOT EXISTS (
      SELECT 1 FROM attendance_records ar
      WHERE ar.session_id = s.session_id AND ar.student_id = u.user_id
  );

INSERT INTO attendance_records (session_id, student_id, section_id, attendance_date, mode, status, sync_status, marked_at)
SELECT s.session_id, u.user_id, s.section_id, s.session_date, 'Manual', 'Absent', 'Synced', NOW()
FROM attendance_sessions s
JOIN users u ON u.email = 'zain.cs@student.com'
JOIN sections sec ON sec.section_id = s.section_id
JOIN course_semester cs ON cs.cs_id = sec.cs_id
JOIN courses c ON c.course_id = cs.course_id
WHERE c.course_code = 'CS101'
  AND sec.section_code = 'A'
  AND s.is_active = FALSE
  AND s.session_date NOT IN (DATE_SUB(CURDATE(), INTERVAL 2 DAY), DATE_SUB(CURDATE(), INTERVAL 5 DAY))
  AND NOT EXISTS (
      SELECT 1 FROM attendance_records ar
      WHERE ar.session_id = s.session_id AND ar.student_id = u.user_id
  );

-- ---------------------------------------------------------
-- Scenario 2: Fatima (IT101-A) - BOUNDARY CASE (~62.5%, 5/8)
-- ---------------------------------------------------------
INSERT INTO attendance_records (session_id, student_id, section_id, attendance_date, mode, status, sync_status, marked_at)
SELECT s.session_id, u.user_id, s.section_id, s.session_date, 'QR', 'Present', 'Synced', NOW()
FROM attendance_sessions s
JOIN users u ON u.email = 'fatima.it@student.com'
JOIN sections sec ON sec.section_id = s.section_id
JOIN course_semester cs ON cs.cs_id = sec.cs_id
JOIN courses c ON c.course_id = cs.course_id
WHERE c.course_code = 'IT101'
  AND sec.section_code = 'A'
  AND s.is_active = FALSE
  AND s.session_date IN (
      DATE_SUB(CURDATE(), INTERVAL 1 DAY),
      DATE_SUB(CURDATE(), INTERVAL 2 DAY),
      DATE_SUB(CURDATE(), INTERVAL 3 DAY),
      DATE_SUB(CURDATE(), INTERVAL 4 DAY),
      DATE_SUB(CURDATE(), INTERVAL 6 DAY)
  )
  AND NOT EXISTS (
      SELECT 1 FROM attendance_records ar
      WHERE ar.session_id = s.session_id AND ar.student_id = u.user_id
  );

INSERT INTO attendance_records (session_id, student_id, section_id, attendance_date, mode, status, sync_status, marked_at)
SELECT s.session_id, u.user_id, s.section_id, s.session_date, 'Manual', 'Absent', 'Synced', NOW()
FROM attendance_sessions s
JOIN users u ON u.email = 'fatima.it@student.com'
JOIN sections sec ON sec.section_id = s.section_id
JOIN course_semester cs ON cs.cs_id = sec.cs_id
JOIN courses c ON c.course_id = cs.course_id
WHERE c.course_code = 'IT101'
  AND sec.section_code = 'A'
  AND s.is_active = FALSE
  AND s.session_date NOT IN (
      DATE_SUB(CURDATE(), INTERVAL 1 DAY),
      DATE_SUB(CURDATE(), INTERVAL 2 DAY),
      DATE_SUB(CURDATE(), INTERVAL 3 DAY),
      DATE_SUB(CURDATE(), INTERVAL 4 DAY),
      DATE_SUB(CURDATE(), INTERVAL 6 DAY)
  )
  AND NOT EXISTS (
      SELECT 1 FROM attendance_records ar
      WHERE ar.session_id = s.session_id AND ar.student_id = u.user_id
  );

-- ---------------------------------------------------------
-- Scenario 3: Sara (CS102-A) - LOW ATTENDANCE (~40%, 4/10)
-- ---------------------------------------------------------
INSERT INTO attendance_records (session_id, student_id, section_id, attendance_date, mode, status, sync_status, marked_at)
SELECT s.session_id, u.user_id, s.section_id, s.session_date, 'QR', 'Present', 'Synced', NOW()
FROM attendance_sessions s
JOIN users u ON u.email = 'sara.cs@student.com'
JOIN sections sec ON sec.section_id = s.section_id
JOIN course_semester cs ON cs.cs_id = sec.cs_id
JOIN courses c ON c.course_id = cs.course_id
WHERE c.course_code = 'CS102'
  AND sec.section_code = 'A'
  AND s.is_active = FALSE
  AND s.session_date IN (
      DATE_SUB(CURDATE(), INTERVAL 1 DAY),
      DATE_SUB(CURDATE(), INTERVAL 3 DAY),
      DATE_SUB(CURDATE(), INTERVAL 6 DAY),
      DATE_SUB(CURDATE(), INTERVAL 9 DAY)
  )
  AND NOT EXISTS (
      SELECT 1 FROM attendance_records ar
      WHERE ar.session_id = s.session_id AND ar.student_id = u.user_id
  );

INSERT INTO attendance_records (session_id, student_id, section_id, attendance_date, mode, status, sync_status, marked_at)
SELECT s.session_id, u.user_id, s.section_id, s.session_date, 'Manual', 'Absent', 'Synced', NOW()
FROM attendance_sessions s
JOIN users u ON u.email = 'sara.cs@student.com'
JOIN sections sec ON sec.section_id = s.section_id
JOIN course_semester cs ON cs.cs_id = sec.cs_id
JOIN courses c ON c.course_id = cs.course_id
WHERE c.course_code = 'CS102'
  AND sec.section_code = 'A'
  AND s.is_active = FALSE
  AND s.session_date NOT IN (
      DATE_SUB(CURDATE(), INTERVAL 1 DAY),
      DATE_SUB(CURDATE(), INTERVAL 3 DAY),
      DATE_SUB(CURDATE(), INTERVAL 6 DAY),
      DATE_SUB(CURDATE(), INTERVAL 9 DAY)
  )
  AND NOT EXISTS (
      SELECT 1 FROM attendance_records ar
      WHERE ar.session_id = s.session_id AND ar.student_id = u.user_id
  );

-- ---------------------------------------------------------
-- Scenario 4: Hassan (SE101-A) - PERFECT ATTENDANCE (100%, 10/10)
-- ---------------------------------------------------------
INSERT INTO attendance_records (session_id, student_id, section_id, attendance_date, mode, status, sync_status, marked_at)
SELECT s.session_id, u.user_id, s.section_id, s.session_date, 'QR', 'Present', 'Synced', NOW()
FROM attendance_sessions s
JOIN users u ON u.email = 'hassan.se@student.com'
JOIN sections sec ON sec.section_id = s.section_id
JOIN course_semester cs ON cs.cs_id = sec.cs_id
JOIN courses c ON c.course_id = cs.course_id
WHERE c.course_code = 'SE101'
  AND sec.section_code = 'A'
  AND s.is_active = FALSE
  AND NOT EXISTS (
      SELECT 1 FROM attendance_records ar
      WHERE ar.session_id = s.session_id AND ar.student_id = u.user_id
  );

-- ---------------------------------------------------------
-- 6) FINES TEST DATA - 3 STUDENTS WITH FINES
-- Zain: 1 PENDING fine (20% attendance in CS101)
-- Fatima: 1 PAID fine (62.5% attendance in IT101)
-- Sara: 1 PENDING fine (40% attendance in CS102)
-- Hassan: No fine (100% attendance)
-- ---------------------------------------------------------

-- FINE 1: Zain - PENDING
INSERT INTO fines (student_id, course_code, course_name, attendance_percentage, fine_amount, status, issued_date, paid_date)
SELECT u.user_id, 'CS101', 'Programming Fundamentals', 20.00, 500.00, 'Pending', NOW(), NULL
FROM users u
WHERE u.email = 'zain.cs@student.com'
  AND NOT EXISTS (
      SELECT 1 FROM fines f
      WHERE f.student_id = u.user_id AND f.course_code = 'CS101' AND f.status = 'Pending'
  );

-- FINE 2: Fatima - PAID
INSERT INTO fines (student_id, course_code, course_name, attendance_percentage, fine_amount, status, issued_date, paid_date)
SELECT u.user_id, 'IT101', 'Web Technologies', 62.50, 500.00, 'Paid', 
       DATE_SUB(NOW(), INTERVAL 10 DAY), DATE_SUB(NOW(), INTERVAL 5 DAY)
FROM users u
WHERE u.email = 'fatima.it@student.com'
  AND NOT EXISTS (
      SELECT 1 FROM fines f
      WHERE f.student_id = u.user_id AND f.course_code = 'IT101' AND f.status = 'Paid'
  );

-- FINE 3: Sara - PENDING
INSERT INTO fines (student_id, course_code, course_name, attendance_percentage, fine_amount, status, issued_date, paid_date)
SELECT u.user_id, 'CS102', 'Object Oriented Programming', 40.00, 500.00, 'Pending', NOW(), NULL
FROM users u
WHERE u.email = 'sara.cs@student.com'
  AND NOT EXISTS (
      SELECT 1 FROM fines f
      WHERE f.student_id = u.user_id AND f.course_code = 'CS102' AND f.status = 'Pending'
  );

-- ---------------------------------------------------------
-- 7) VERIFICATION QUERIES
-- ---------------------------------------------------------
SELECT '======== TEST DATA SUMMARY ========' AS status;
SELECT
    (SELECT COUNT(*) FROM users WHERE role='Student') AS total_students,
    (SELECT COUNT(*) FROM attendance_sessions WHERE is_active=TRUE) AS active_sessions_today,
    (SELECT COUNT(*) FROM attendance_sessions WHERE is_active=FALSE) AS closed_sessions,
    (SELECT COUNT(*) FROM attendance_records) AS total_attendance_records;

SELECT '======== STUDENTS WITH FINES ========' AS status;
SELECT
    u.full_name,
    u.email,
    f.course_code,
    f.course_name,
    CONCAT(f.attendance_percentage, '%') AS attendance,
    f.fine_amount,
    f.status,
    f.issued_date,
    f.paid_date
FROM fines f
JOIN users u ON u.user_id = f.student_id
ORDER BY f.status DESC, f.issued_date DESC;

SELECT '======== ENROLLMENT & ATTENDANCE OVERVIEW ========' AS status;
SELECT
    u.full_name,
    u.email,
    c.course_code,
    sec.section_code,
    COUNT(ar.record_id) as total_sessions,
    SUM(CASE WHEN ar.status = 'Present' THEN 1 ELSE 0 END) as present_count,
    ROUND(SUM(CASE WHEN ar.status = 'Present' THEN 1 ELSE 0 END) / COUNT(ar.record_id) * 100, 2) as attendance_percentage
FROM student_enrollment se
JOIN users u ON u.user_id = se.student_id
JOIN sections sec ON sec.section_id = se.section_id
JOIN course_semester cs ON cs.cs_id = sec.cs_id
JOIN courses c ON c.course_id = cs.course_id
LEFT JOIN attendance_records ar ON ar.student_id = u.user_id AND ar.section_id = sec.section_id
WHERE u.email IN ('zain.cs@student.com', 'fatima.it@student.com', 'sara.cs@student.com', 'hassan.se@student.com')
GROUP BY u.user_id, u.full_name, u.email, c.course_code, sec.section_code
ORDER BY u.email, c.course_code;

SELECT '======== ACTIVE SESSIONS FOR TESTING ========' AS status;
SELECT
    c.course_code,
    sec.section_code,
    s.session_id,
    s.session_date,
    s.start_time,
    COUNT(se.student_id) as enrolled_students
FROM attendance_sessions s
JOIN sections sec ON sec.section_id = s.section_id
JOIN course_semester cs ON cs.cs_id = sec.cs_id
JOIN courses c ON c.course_id = cs.course_id
LEFT JOIN student_enrollment se ON se.section_id = sec.section_id
WHERE s.is_active = TRUE
GROUP BY s.session_id, c.course_code, sec.section_code
ORDER BY c.course_code;

SELECT 'test_cases.sql EXECUTED SUCCESSFULLY' AS final_status;