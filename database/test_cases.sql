-- =========================================================
-- TriAttendanceDB Test Cases Data Pack
-- Run AFTER schema.sql + seed.sql + hardening.sql
-- =========================================================
USE TriAttendanceDB;

-- ---------------------------------------------------------
-- 1) Extra students for richer scenarios
-- Password hash below is same as existing seed student hash.
-- ---------------------------------------------------------
INSERT INTO users (email, password, role, full_name, phone, registration_no, program_id, current_sem_id)
SELECT
    'zain.cs@student.com',
    '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy',
    'Student',
    'Zain CS',
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
    'Fatima IT',
    '03002222002',
    '2024-IT-002',
    p.program_id,
    s.sem_id
FROM programs p
JOIN semesters s ON s.program_id = p.program_id AND s.is_active = TRUE
WHERE p.program_code = 'BS-IT'
  AND NOT EXISTS (SELECT 1 FROM users WHERE email = 'fatima.it@student.com');

-- ---------------------------------------------------------
-- 2) Explicit enrollment mismatch scenario
-- zain.cs -> enrolled in CS101-A
-- fatima.it -> enrolled in IT101-A (not in CS101-A)
-- ---------------------------------------------------------
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

-- ---------------------------------------------------------
-- 3) Ownership test sessions
-- Active: CS101-A
-- Active: IT101-A
-- Closed: CS101-A
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

INSERT INTO attendance_sessions (section_id, teacher_id, session_date, start_time, end_time, session_token, mode, qr_code, qr_generated_at, is_active)
SELECT sec.section_id, sec.teacher_id, DATE_SUB(CURDATE(), INTERVAL 1 DAY), NOW(), NOW(), UUID(), 'Hybrid', NULL, NOW(), FALSE
FROM sections sec
JOIN course_semester cs ON cs.cs_id = sec.cs_id
JOIN courses c ON c.course_id = cs.course_id
WHERE c.course_code = 'CS101'
  AND sec.section_code = 'A'
  AND NOT EXISTS (
      SELECT 1 FROM attendance_sessions s
      WHERE s.section_id = sec.section_id
        AND s.session_date = DATE_SUB(CURDATE(), INTERVAL 1 DAY)
        AND s.is_active = FALSE
  );

-- ---------------------------------------------------------
-- 4) Attendance records to force low-attendance scenario
-- For zain.cs: 1 present out of 5 sessions (~20%)
-- ---------------------------------------------------------
INSERT INTO attendance_sessions (section_id, teacher_id, session_date, start_time, end_time, session_token, mode, qr_code, qr_generated_at, is_active)
SELECT sec.section_id, sec.teacher_id, DATE_SUB(CURDATE(), INTERVAL 2 DAY), NOW(), NOW(), UUID(), 'Hybrid', NULL, NOW(), FALSE
FROM sections sec
JOIN course_semester cs ON cs.cs_id = sec.cs_id
JOIN courses c ON c.course_id = cs.course_id
WHERE c.course_code = 'CS101'
  AND sec.section_code = 'A'
  AND NOT EXISTS (
      SELECT 1 FROM attendance_sessions s
      WHERE s.section_id = sec.section_id AND s.session_date = DATE_SUB(CURDATE(), INTERVAL 2 DAY)
  );

INSERT INTO attendance_sessions (section_id, teacher_id, session_date, start_time, end_time, session_token, mode, qr_code, qr_generated_at, is_active)
SELECT sec.section_id, sec.teacher_id, DATE_SUB(CURDATE(), INTERVAL 3 DAY), NOW(), NOW(), UUID(), 'Hybrid', NULL, NOW(), FALSE
FROM sections sec
JOIN course_semester cs ON cs.cs_id = sec.cs_id
JOIN courses c ON c.course_id = cs.course_id
WHERE c.course_code = 'CS101'
  AND sec.section_code = 'A'
  AND NOT EXISTS (
      SELECT 1 FROM attendance_sessions s
      WHERE s.section_id = sec.section_id AND s.session_date = DATE_SUB(CURDATE(), INTERVAL 3 DAY)
  );

INSERT INTO attendance_sessions (section_id, teacher_id, session_date, start_time, end_time, session_token, mode, qr_code, qr_generated_at, is_active)
SELECT sec.section_id, sec.teacher_id, DATE_SUB(CURDATE(), INTERVAL 4 DAY), NOW(), NOW(), UUID(), 'Hybrid', NULL, NOW(), FALSE
FROM sections sec
JOIN course_semester cs ON cs.cs_id = sec.cs_id
JOIN courses c ON c.course_id = cs.course_id
WHERE c.course_code = 'CS101'
  AND sec.section_code = 'A'
  AND NOT EXISTS (
      SELECT 1 FROM attendance_sessions s
      WHERE s.section_id = sec.section_id AND s.session_date = DATE_SUB(CURDATE(), INTERVAL 4 DAY)
  );

INSERT INTO attendance_sessions (section_id, teacher_id, session_date, start_time, end_time, session_token, mode, qr_code, qr_generated_at, is_active)
SELECT sec.section_id, sec.teacher_id, DATE_SUB(CURDATE(), INTERVAL 5 DAY), NOW(), NOW(), UUID(), 'Hybrid', NULL, NOW(), FALSE
FROM sections sec
JOIN course_semester cs ON cs.cs_id = sec.cs_id
JOIN courses c ON c.course_id = cs.course_id
WHERE c.course_code = 'CS101'
  AND sec.section_code = 'A'
  AND NOT EXISTS (
      SELECT 1 FROM attendance_sessions s
      WHERE s.section_id = sec.section_id AND s.session_date = DATE_SUB(CURDATE(), INTERVAL 5 DAY)
  );

-- mark only one historical session as present for zain.cs
INSERT INTO attendance_records (session_id, student_id, section_id, attendance_date, mode, status, sync_status, marked_at)
SELECT s.session_id, u.user_id, s.section_id, s.session_date, 'Manual', 'Present', 'Synced', NOW()
FROM attendance_sessions s
JOIN users u ON u.email = 'zain.cs@student.com'
JOIN sections sec ON sec.section_id = s.section_id
JOIN course_semester cs ON cs.cs_id = sec.cs_id
JOIN courses c ON c.course_id = cs.course_id
WHERE c.course_code = 'CS101'
  AND sec.section_code = 'A'
  AND s.session_date = DATE_SUB(CURDATE(), INTERVAL 2 DAY)
  AND NOT EXISTS (
      SELECT 1 FROM attendance_records ar
      WHERE ar.session_id = s.session_id AND ar.student_id = u.user_id
  );

-- ---------------------------------------------------------
-- 5) Fines test data: one pending + one paid
-- ---------------------------------------------------------
INSERT INTO fines (student_id, course_code, course_name, attendance_percentage, fine_amount, status, issued_date, paid_date)
SELECT u.user_id, 'CS101', 'Programming Fundamentals', 20.00, 500.00, 'Pending', NOW(), NULL
FROM users u
WHERE u.email = 'zain.cs@student.com'
  AND NOT EXISTS (
      SELECT 1 FROM fines f
      WHERE f.student_id = u.user_id AND f.course_code = 'CS101' AND f.status = 'Pending'
  );

INSERT INTO fines (student_id, course_code, course_name, attendance_percentage, fine_amount, status, issued_date, paid_date)
SELECT u.user_id, 'IT101', 'Web Technologies', 60.00, 500.00, 'Paid', DATE_SUB(NOW(), INTERVAL 7 DAY), DATE_SUB(NOW(), INTERVAL 6 DAY)
FROM users u
WHERE u.email = 'fatima.it@student.com'
  AND NOT EXISTS (
      SELECT 1 FROM fines f
      WHERE f.student_id = u.user_id AND f.course_code = 'IT101' AND f.status = 'Paid'
  );

-- ---------------------------------------------------------
-- 6) Verification snapshot for quick test setup checks
-- ---------------------------------------------------------
SELECT
    (SELECT COUNT(*) FROM users WHERE role='Student') AS total_students,
    (SELECT COUNT(*) FROM attendance_sessions WHERE is_active=TRUE) AS active_sessions,
    (SELECT COUNT(*) FROM fines WHERE status='Pending') AS pending_fines,
    (SELECT COUNT(*) FROM fines WHERE status='Paid') AS paid_fines;

SELECT
    u.full_name,
    u.email,
    c.course_code,
    sec.section_code
FROM student_enrollment se
JOIN users u ON u.user_id = se.student_id
JOIN sections sec ON sec.section_id = se.section_id
JOIN course_semester cs ON cs.cs_id = sec.cs_id
JOIN courses c ON c.course_id = cs.course_id
WHERE u.email IN ('zain.cs@student.com', 'fatima.it@student.com')
ORDER BY u.email, c.course_code, sec.section_code;

SELECT 'test_cases.sql executed successfully' AS status;
