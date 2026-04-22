-- =========================================================
-- TriAttendanceDB Seed 
-- =========================================================
USE TriAttendanceDB;

SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE attendance_records;
TRUNCATE TABLE attendance_sessions;
TRUNCATE TABLE student_enrollment;
TRUNCATE TABLE sections;
TRUNCATE TABLE course_semester;
TRUNCATE TABLE users;
TRUNCATE TABLE courses;
TRUNCATE TABLE semesters;
TRUNCATE TABLE programs;
TRUNCATE TABLE departments;
TRUNCATE TABLE fines;
TRUNCATE TABLE facial_data;
SET FOREIGN_KEY_CHECKS = 1;

INSERT INTO departments (dept_code, dept_name, hod_name, contact_email) VALUES
('CS', 'Computer Science', 'Dr. Ahmed Raza', 'cs@university.edu'),
('IT', 'Information Technology', 'Dr. Ali Haider', 'it@university.edu'),
('SE', 'Software Engineering', 'Dr. Umar Farooq', 'se@university.edu'),
('AI', 'Artificial Intelligence', 'Dr. Hina Naeem', 'ai@university.edu');

INSERT INTO programs (dept_id, program_code, program_name, duration, degree)
SELECT dept_id, CONCAT('BS-', dept_code),
       CONCAT('Bachelor of Science in ', dept_name), 8, 'BS'
FROM departments;

INSERT INTO semesters (program_id, semester_number, semester_name, start_date, end_date, is_active)
SELECT program_id, 1, 'Fall 2025', '2025-09-01', '2026-01-15', TRUE
FROM programs;

INSERT INTO courses (dept_id, course_code, course_name, credit_hours, course_type) VALUES
((SELECT dept_id FROM departments WHERE dept_code='CS'), 'CS101', 'Programming Fundamentals', 3, 'Theory'),
((SELECT dept_id FROM departments WHERE dept_code='CS'), 'CS102', 'Calculus I', 3, 'Theory'),
((SELECT dept_id FROM departments WHERE dept_code='IT'), 'IT101', 'Web Technologies', 3, 'Both'),
((SELECT dept_id FROM departments WHERE dept_code='IT'), 'IT102', 'Calculus I', 3, 'Theory'),
((SELECT dept_id FROM departments WHERE dept_code='SE'), 'SE101', 'Software Fundamentals', 3, 'Theory'),
((SELECT dept_id FROM departments WHERE dept_code='SE'), 'SE102', 'Calculus I', 3, 'Theory'),
((SELECT dept_id FROM departments WHERE dept_code='AI'), 'AI101', 'Introduction to AI', 3, 'Theory'),
((SELECT dept_id FROM departments WHERE dept_code='AI'), 'AI102', 'Calculus I', 3, 'Theory');

INSERT INTO course_semester (course_id, sem_id, is_compulsory)
SELECT c.course_id, s.sem_id, TRUE
FROM courses c
JOIN programs p ON p.dept_id = c.dept_id
JOIN semesters s ON s.program_id = p.program_id AND s.is_active = TRUE;

INSERT INTO users (email, password, role, full_name, phone) VALUES
('admin@tria.com', '$2b$12$eQur4nCSdUD.MwQKMLm4qeETULDHykrjRh4qRqzM/u0Fp.d4Y/jrO', 'Admin', 'System Administrator', '03000000000');

INSERT INTO users (email, password, role, full_name, phone, dept_id, employee_id, qualification) VALUES
('dr.ahmed@tria.com', '$2b$12$IMdGr2vhxHagNVFoj.A/Z.13JoOf04EYVEzgGrv3DtuW7RhOhHcXi', 'Teacher', 'Teacher CS101', '03001111001', (SELECT dept_id FROM departments WHERE dept_code='CS'), 'TCH-CS-001', 'MS'),
('dr.bilal@tria.com', '$2b$12$IMdGr2vhxHagNVFoj.A/Z.13JoOf04EYVEzgGrv3DtuW7RhOhHcXi', 'Teacher', 'Teacher CS102', '03001111002', (SELECT dept_id FROM departments WHERE dept_code='CS'), 'TCH-CS-002', 'MS'),
('dr.umar@tria.com', '$2b$12$IMdGr2vhxHagNVFoj.A/Z.13JoOf04EYVEzgGrv3DtuW7RhOhHcXi', 'Teacher', 'Teacher IT101', '03001111003', (SELECT dept_id FROM departments WHERE dept_code='IT'), 'TCH-IT-001', 'MS'),
('dr.zara@tria.com', '$2b$12$IMdGr2vhxHagNVFoj.A/Z.13JoOf04EYVEzgGrv3DtuW7RhOhHcXi', 'Teacher', 'Teacher IT102', '03001111004', (SELECT dept_id FROM departments WHERE dept_code='IT'), 'TCH-IT-002', 'MS'),
('dr.hamza@tria.com', '$2b$12$IMdGr2vhxHagNVFoj.A/Z.13JoOf04EYVEzgGrv3DtuW7RhOhHcXi', 'Teacher', 'Teacher SE101', '03001111005', (SELECT dept_id FROM departments WHERE dept_code='SE'), 'TCH-SE-001', 'MS'),
('dr.emaan@tria.com', '$2b$12$IMdGr2vhxHagNVFoj.A/Z.13JoOf04EYVEzgGrv3DtuW7RhOhHcXi', 'Teacher', 'Teacher SE102', '03001111006', (SELECT dept_id FROM departments WHERE dept_code='SE'), 'TCH-SE-002', 'MS'),
('dr.farhan@tria.com', '$2b$12$IMdGr2vhxHagNVFoj.A/Z.13JoOf04EYVEzgGrv3DtuW7RhOhHcXi', 'Teacher', 'Teacher AI101', '03001111007', (SELECT dept_id FROM departments WHERE dept_code='AI'), 'TCH-AI-001', 'MS'),
('dr.rabia@tria.com', '$2b$12$IMdGr2vhxHagNVFoj.A/Z.13JoOf04EYVEzgGrv3DtuW7RhOhHcXi', 'Teacher', 'Teacher AI102', '03001111008', (SELECT dept_id FROM departments WHERE dept_code='AI'), 'TCH-AI-002', 'MS');

INSERT INTO users (email, password, role, full_name, phone, registration_no, program_id, current_sem_id) VALUES
('ali.raza@student.com', '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy', 'Student', 'Ali Raza', '03001111101', '2024-CS-001',
 (SELECT program_id FROM programs WHERE program_code='BS-CS'),
 (SELECT s.sem_id FROM semesters s JOIN programs p ON s.program_id=p.program_id WHERE p.program_code='BS-CS' AND s.is_active=TRUE LIMIT 1)),
('sara.khan@student.com', '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy', 'Student', 'Sara Khan', '03001111102', '2024-CS-002',
 (SELECT program_id FROM programs WHERE program_code='BS-CS'),
 (SELECT s.sem_id FROM semesters s JOIN programs p ON s.program_id=p.program_id WHERE p.program_code='BS-CS' AND s.is_active=TRUE LIMIT 1)),
('hamza.ali@student.com', '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy', 'Student', 'Hamza Ali', '03001111201', '2024-IT-001',
 (SELECT program_id FROM programs WHERE program_code='BS-IT'),
 (SELECT s.sem_id FROM semesters s JOIN programs p ON s.program_id=p.program_id WHERE p.program_code='BS-IT' AND s.is_active=TRUE LIMIT 1)),
('manahil.rauf@student.com', '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy', 'Student', 'Manahil Rauf', '03001111301', '2024-SE-001',
 (SELECT program_id FROM programs WHERE program_code='BS-SE'),
 (SELECT s.sem_id FROM semesters s JOIN programs p ON s.program_id=p.program_id WHERE p.program_code='BS-SE' AND s.is_active=TRUE LIMIT 1)),
('rayyan.ahmed@student.com', '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy', 'Student', 'Rayyan Ahmed', '03001111401', '2024-AI-001',
 (SELECT program_id FROM programs WHERE program_code='BS-AI'),
 (SELECT s.sem_id FROM semesters s JOIN programs p ON s.program_id=p.program_id WHERE p.program_code='BS-AI' AND s.is_active=TRUE LIMIT 1));

-- Create A/B sections for each mapped course
INSERT INTO sections (cs_id, section_code, teacher_id, room_no, capacity, enrolled_count, is_active)
SELECT cs.cs_id, 'A',
       CASE c.course_code
           WHEN 'CS101' THEN (SELECT user_id FROM users WHERE email='dr.ahmed@tria.com')
           WHEN 'CS102' THEN (SELECT user_id FROM users WHERE email='dr.bilal@tria.com')
           WHEN 'IT101' THEN (SELECT user_id FROM users WHERE email='dr.umar@tria.com')
           WHEN 'IT102' THEN (SELECT user_id FROM users WHERE email='dr.zara@tria.com')
           WHEN 'SE101' THEN (SELECT user_id FROM users WHERE email='dr.hamza@tria.com')
           WHEN 'SE102' THEN (SELECT user_id FROM users WHERE email='dr.emaan@tria.com')
           WHEN 'AI101' THEN (SELECT user_id FROM users WHERE email='dr.farhan@tria.com')
           WHEN 'AI102' THEN (SELECT user_id FROM users WHERE email='dr.rabia@tria.com')
       END,
       CONCAT('Room ', c.course_code, '-A'), 30, 0, TRUE
FROM course_semester cs
JOIN courses c ON c.course_id = cs.course_id;

INSERT INTO sections (cs_id, section_code, teacher_id, room_no, capacity, enrolled_count, is_active)
SELECT cs.cs_id, 'B',
       CASE c.course_code
           WHEN 'CS101' THEN (SELECT user_id FROM users WHERE email='dr.ahmed@tria.com')
           WHEN 'CS102' THEN (SELECT user_id FROM users WHERE email='dr.bilal@tria.com')
           WHEN 'IT101' THEN (SELECT user_id FROM users WHERE email='dr.umar@tria.com')
           WHEN 'IT102' THEN (SELECT user_id FROM users WHERE email='dr.zara@tria.com')
           WHEN 'SE101' THEN (SELECT user_id FROM users WHERE email='dr.hamza@tria.com')
           WHEN 'SE102' THEN (SELECT user_id FROM users WHERE email='dr.emaan@tria.com')
           WHEN 'AI101' THEN (SELECT user_id FROM users WHERE email='dr.farhan@tria.com')
           WHEN 'AI102' THEN (SELECT user_id FROM users WHERE email='dr.rabia@tria.com')
       END,
       CONCAT('Room ', c.course_code, '-B'), 30, 0, TRUE
FROM course_semester cs
JOIN courses c ON c.course_id = cs.course_id;

-- Enroll students into their own department/program sections
INSERT INTO student_enrollment (student_id, section_id)
SELECT u.user_id, s.section_id
FROM users u
JOIN programs p ON p.program_id = u.program_id
JOIN courses c ON c.dept_id = p.dept_id
JOIN course_semester cs ON cs.course_id = c.course_id
JOIN sections s ON s.cs_id = cs.cs_id
WHERE u.role='Student'
  AND ((s.section_code='A' AND MOD(u.user_id,2)=1) OR (s.section_code='B' AND MOD(u.user_id,2)=0));

-- Minimal sample attendance (no duplicates)
INSERT INTO attendance_sessions (section_id, teacher_id, session_date, start_time, session_token, mode, is_active)
SELECT s.section_id, s.teacher_id, CURDATE(), NOW(), UUID(), 'Hybrid', TRUE
FROM sections s
LIMIT 2;

INSERT INTO attendance_records (session_id, student_id, section_id, attendance_date, mode, status, sync_status, marked_at)
SELECT sess.session_id, se.student_id, sess.section_id, CURDATE(), 'QR', 'Present', 'Synced', NOW()
FROM attendance_sessions sess
JOIN student_enrollment se ON se.section_id = sess.section_id
LIMIT 6;

SELECT 'Seed completed successfully' AS status;
