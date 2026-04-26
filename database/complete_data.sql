-- =========================================================
-- TriAttendanceDB — COMPLETE DATA PACK (REVISED)
-- Requirements:
--   4 Departments: CS, IT, SE, AI
--   5 Courses per department (20 total)
--   6 Teachers per department (24 total)
--   2 Sections per course, 15 students per section
--   30 students per department (120 total)
--   15+ low attendance students with mixed percentages
--   Fines for low-attendance students
--   Admin user preserved
-- Run AFTER: schema.sql → hardening.sql
-- =========================================================

USE TriAttendanceDB;

-- =========================================================
-- STEP 0: CLEAN SLATE
-- =========================================================
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE chatbot_messages;
TRUNCATE TABLE chatbot_sessions;
TRUNCATE TABLE fines;
TRUNCATE TABLE attendance_records;
TRUNCATE TABLE attendance_sessions;
TRUNCATE TABLE student_enrollment;
TRUNCATE TABLE sections;
TRUNCATE TABLE course_semester;
TRUNCATE TABLE facial_data;

SET SQL_SAFE_UPDATES = 0;
DELETE FROM users WHERE role IN ('Teacher','Student');
SET SQL_SAFE_UPDATES = 1;

TRUNCATE TABLE courses;
TRUNCATE TABLE semesters;
TRUNCATE TABLE programs;
TRUNCATE TABLE departments;
SET FOREIGN_KEY_CHECKS = 1;

-- =========================================================
-- STEP 1: ADMIN USER (preserved)
-- =========================================================
INSERT IGNORE INTO users (email, password, role, full_name, phone)
VALUES ('admin@tria.com', '$2b$12$eQur4nCSdUD.MwQKMLm4qeETULDHykrjRh4qRqzM/u0Fp.d4Y/jrO', 'Admin', 'System Administrator', '03000000000');

-- =========================================================
-- STEP 2: DEPARTMENTS
-- =========================================================
INSERT INTO departments (dept_code, dept_name, hod_name, contact_email) VALUES
('CS', 'Computer Science',        'Dr. Ahmed Raza',   'cs@tria.edu'),
('IT', 'Information Technology',  'Dr. Ali Haider',   'it@tria.edu'),
('SE', 'Software Engineering',    'Dr. Umar Farooq',  'se@tria.edu'),
('AI', 'Artificial Intelligence', 'Dr. Hina Naeem',   'ai@tria.edu');

-- =========================================================
-- STEP 3: PROGRAMS
-- =========================================================
INSERT INTO programs (dept_id, program_code, program_name, duration, degree)
SELECT dept_id, CONCAT('BS-', dept_code), CONCAT('Bachelor of Science in ', dept_name), 8, 'BS'
FROM departments;

-- =========================================================
-- STEP 4: ACTIVE SEMESTERS
-- =========================================================
INSERT INTO semesters (program_id, semester_number, semester_name, start_date, end_date, is_active)
SELECT program_id, 1, 'Fall 2025', '2025-09-01', '2026-01-15', TRUE
FROM programs;

-- =========================================================
-- STEP 5: COURSES (5 per department = 20 total)
-- =========================================================
INSERT INTO courses (dept_id, course_code, course_name, credit_hours, course_type) VALUES
-- CS
((SELECT dept_id FROM departments WHERE dept_code='CS'), 'CS101', 'Programming Fundamentals',    3, 'Theory'),
((SELECT dept_id FROM departments WHERE dept_code='CS'), 'CS102', 'Object Oriented Programming', 3, 'Theory'),
((SELECT dept_id FROM departments WHERE dept_code='CS'), 'CS103', 'Data Structures',             3, 'Theory'),
((SELECT dept_id FROM departments WHERE dept_code='CS'), 'CS104', 'Database Systems',            3, 'Both'),
((SELECT dept_id FROM departments WHERE dept_code='CS'), 'CS105', 'Computer Networks',           3, 'Theory'),
-- IT
((SELECT dept_id FROM departments WHERE dept_code='IT'), 'IT101', 'Web Technologies',            3, 'Both'),
((SELECT dept_id FROM departments WHERE dept_code='IT'), 'IT102', 'Network Administration',      3, 'Theory'),
((SELECT dept_id FROM departments WHERE dept_code='IT'), 'IT103', 'System Analysis & Design',    3, 'Theory'),
((SELECT dept_id FROM departments WHERE dept_code='IT'), 'IT104', 'Cloud Computing',             3, 'Theory'),
((SELECT dept_id FROM departments WHERE dept_code='IT'), 'IT105', 'Cybersecurity Fundamentals',  3, 'Theory'),
-- SE
((SELECT dept_id FROM departments WHERE dept_code='SE'), 'SE101', 'Software Fundamentals',       3, 'Theory'),
((SELECT dept_id FROM departments WHERE dept_code='SE'), 'SE102', 'Software Design Patterns',    3, 'Theory'),
((SELECT dept_id FROM departments WHERE dept_code='SE'), 'SE103', 'Software Testing & QA',       3, 'Both'),
((SELECT dept_id FROM departments WHERE dept_code='SE'), 'SE104', 'Agile Methodologies',         3, 'Theory'),
((SELECT dept_id FROM departments WHERE dept_code='SE'), 'SE105', 'Software Project Management', 3, 'Theory'),
-- AI
((SELECT dept_id FROM departments WHERE dept_code='AI'), 'AI101', 'Introduction to AI',          3, 'Theory'),
((SELECT dept_id FROM departments WHERE dept_code='AI'), 'AI102', 'Machine Learning',             3, 'Both'),
((SELECT dept_id FROM departments WHERE dept_code='AI'), 'AI103', 'Deep Learning',                3, 'Theory'),
((SELECT dept_id FROM departments WHERE dept_code='AI'), 'AI104', 'Natural Language Processing',  3, 'Theory'),
((SELECT dept_id FROM departments WHERE dept_code='AI'), 'AI105', 'Computer Vision',              3, 'Both');

-- =========================================================
-- STEP 6: MAP COURSES TO SEMESTERS
-- =========================================================
INSERT INTO course_semester (course_id, sem_id, is_compulsory)
SELECT c.course_id, s.sem_id, TRUE
FROM courses c
JOIN programs p ON p.dept_id = c.dept_id
JOIN semesters s ON s.program_id = p.program_id AND s.is_active = TRUE;

-- =========================================================
-- STEP 7: TEACHERS (6 per department = 24 total)
-- Password: teacher123 (bcrypt)
-- $2b$12$IMdGr2vhxHagNVFoj.A/Z.13JoOf04EYVEzgGrv3DtuW7RhOhHcXi
-- =========================================================

-- CS Teachers (6)
INSERT INTO users (email, password, role, full_name, phone, dept_id, employee_id, qualification) VALUES
('prof.farhan.cs@tria.com',  '$2b$12$IMdGr2vhxHagNVFoj.A/Z.13JoOf04EYVEzgGrv3DtuW7RhOhHcXi', 'Teacher', 'Prof. Farhan Ali',      '03011110001', (SELECT dept_id FROM departments WHERE dept_code='CS'), 'TCH-CS-001', 'PhD'),
('prof.nadia.cs@tria.com',   '$2b$12$IMdGr2vhxHagNVFoj.A/Z.13JoOf04EYVEzgGrv3DtuW7RhOhHcXi', 'Teacher', 'Prof. Nadia Hussain',   '03011110002', (SELECT dept_id FROM departments WHERE dept_code='CS'), 'TCH-CS-002', 'MS'),
('prof.kamil.cs@tria.com',   '$2b$12$IMdGr2vhxHagNVFoj.A/Z.13JoOf04EYVEzgGrv3DtuW7RhOhHcXi', 'Teacher', 'Prof. Kamil Raza',      '03011110003', (SELECT dept_id FROM departments WHERE dept_code='CS'), 'TCH-CS-003', 'PhD'),
('prof.amna.cs@tria.com',    '$2b$12$IMdGr2vhxHagNVFoj.A/Z.13JoOf04EYVEzgGrv3DtuW7RhOhHcXi', 'Teacher', 'Prof. Amna Siddiqui',   '03011110004', (SELECT dept_id FROM departments WHERE dept_code='CS'), 'TCH-CS-004', 'MS'),
('prof.tariq.cs@tria.com',   '$2b$12$IMdGr2vhxHagNVFoj.A/Z.13JoOf04EYVEzgGrv3DtuW7RhOhHcXi', 'Teacher', 'Prof. Tariq Jameel',    '03011110005', (SELECT dept_id FROM departments WHERE dept_code='CS'), 'TCH-CS-005', 'PhD'),
('prof.rabia.cs@tria.com',   '$2b$12$IMdGr2vhxHagNVFoj.A/Z.13JoOf04EYVEzgGrv3DtuW7RhOhHcXi', 'Teacher', 'Prof. Rabia Akhtar',    '03011110006', (SELECT dept_id FROM departments WHERE dept_code='CS'), 'TCH-CS-006', 'MS');

-- IT Teachers (6)
INSERT INTO users (email, password, role, full_name, phone, dept_id, employee_id, qualification) VALUES
('prof.asad.it@tria.com',    '$2b$12$IMdGr2vhxHagNVFoj.A/Z.13JoOf04EYVEzgGrv3DtuW7RhOhHcXi', 'Teacher', 'Prof. Asad Mehmood',    '03011110101', (SELECT dept_id FROM departments WHERE dept_code='IT'), 'TCH-IT-001', 'PhD'),
('prof.hira.it@tria.com',    '$2b$12$IMdGr2vhxHagNVFoj.A/Z.13JoOf04EYVEzgGrv3DtuW7RhOhHcXi', 'Teacher', 'Prof. Hira Baig',       '03011110102', (SELECT dept_id FROM departments WHERE dept_code='IT'), 'TCH-IT-002', 'MS'),
('prof.waqas.it@tria.com',   '$2b$12$IMdGr2vhxHagNVFoj.A/Z.13JoOf04EYVEzgGrv3DtuW7RhOhHcXi', 'Teacher', 'Prof. Waqas Iqbal',     '03011110103', (SELECT dept_id FROM departments WHERE dept_code='IT'), 'TCH-IT-003', 'PhD'),
('prof.mehwish.it@tria.com', '$2b$12$IMdGr2vhxHagNVFoj.A/Z.13JoOf04EYVEzgGrv3DtuW7RhOhHcXi', 'Teacher', 'Prof. Mehwish Tariq',   '03011110104', (SELECT dept_id FROM departments WHERE dept_code='IT'), 'TCH-IT-004', 'MS'),
('prof.danish.it@tria.com',  '$2b$12$IMdGr2vhxHagNVFoj.A/Z.13JoOf04EYVEzgGrv3DtuW7RhOhHcXi', 'Teacher', 'Prof. Danish Qureshi',  '03011110105', (SELECT dept_id FROM departments WHERE dept_code='IT'), 'TCH-IT-005', 'PhD'),
('prof.sadia.it@tria.com',   '$2b$12$IMdGr2vhxHagNVFoj.A/Z.13JoOf04EYVEzgGrv3DtuW7RhOhHcXi', 'Teacher', 'Prof. Sadia Rani',      '03011110106', (SELECT dept_id FROM departments WHERE dept_code='IT'), 'TCH-IT-006', 'MS');

-- SE Teachers (6)
INSERT INTO users (email, password, role, full_name, phone, dept_id, employee_id, qualification) VALUES
('prof.bilal.se@tria.com',   '$2b$12$IMdGr2vhxHagNVFoj.A/Z.13JoOf04EYVEzgGrv3DtuW7RhOhHcXi', 'Teacher', 'Prof. Bilal Shahid',    '03011110201', (SELECT dept_id FROM departments WHERE dept_code='SE'), 'TCH-SE-001', 'PhD'),
('prof.sana.se@tria.com',    '$2b$12$IMdGr2vhxHagNVFoj.A/Z.13JoOf04EYVEzgGrv3DtuW7RhOhHcXi', 'Teacher', 'Prof. Sana Rehman',     '03011110202', (SELECT dept_id FROM departments WHERE dept_code='SE'), 'TCH-SE-002', 'MS'),
('prof.junaid.se@tria.com',  '$2b$12$IMdGr2vhxHagNVFoj.A/Z.13JoOf04EYVEzgGrv3DtuW7RhOhHcXi', 'Teacher', 'Prof. Junaid Mirza',    '03011110203', (SELECT dept_id FROM departments WHERE dept_code='SE'), 'TCH-SE-003', 'PhD'),
('prof.lubna.se@tria.com',   '$2b$12$IMdGr2vhxHagNVFoj.A/Z.13JoOf04EYVEzgGrv3DtuW7RhOhHcXi', 'Teacher', 'Prof. Lubna Sarwar',    '03011110204', (SELECT dept_id FROM departments WHERE dept_code='SE'), 'TCH-SE-004', 'MS'),
('prof.adnan.se@tria.com',   '$2b$12$IMdGr2vhxHagNVFoj.A/Z.13JoOf04EYVEzgGrv3DtuW7RhOhHcXi', 'Teacher', 'Prof. Adnan Sheikh',    '03011110205', (SELECT dept_id FROM departments WHERE dept_code='SE'), 'TCH-SE-005', 'PhD'),
('prof.rukhsana.se@tria.com','$2b$12$IMdGr2vhxHagNVFoj.A/Z.13JoOf04EYVEzgGrv3DtuW7RhOhHcXi', 'Teacher', 'Prof. Rukhsana Bibi',   '03011110206', (SELECT dept_id FROM departments WHERE dept_code='SE'), 'TCH-SE-006', 'MS');

-- AI Teachers (6)
INSERT INTO users (email, password, role, full_name, phone, dept_id, employee_id, qualification) VALUES
('prof.zubair.ai@tria.com',  '$2b$12$IMdGr2vhxHagNVFoj.A/Z.13JoOf04EYVEzgGrv3DtuW7RhOhHcXi', 'Teacher', 'Prof. Zubair Khan',     '03011110301', (SELECT dept_id FROM departments WHERE dept_code='AI'), 'TCH-AI-001', 'PhD'),
('prof.maira.ai@tria.com',   '$2b$12$IMdGr2vhxHagNVFoj.A/Z.13JoOf04EYVEzgGrv3DtuW7RhOhHcXi', 'Teacher', 'Prof. Maira Qureshi',   '03011110302', (SELECT dept_id FROM departments WHERE dept_code='AI'), 'TCH-AI-002', 'MS'),
('prof.usman.ai@tria.com',   '$2b$12$IMdGr2vhxHagNVFoj.A/Z.13JoOf04EYVEzgGrv3DtuW7RhOhHcXi', 'Teacher', 'Prof. Usman Ghani',     '03011110303', (SELECT dept_id FROM departments WHERE dept_code='AI'), 'TCH-AI-003', 'PhD'),
('prof.noor.ai@tria.com',    '$2b$12$IMdGr2vhxHagNVFoj.A/Z.13JoOf04EYVEzgGrv3DtuW7RhOhHcXi', 'Teacher', 'Prof. Noor Fatima',     '03011110304', (SELECT dept_id FROM departments WHERE dept_code='AI'), 'TCH-AI-004', 'MS'),
('prof.shahbaz.ai@tria.com', '$2b$12$IMdGr2vhxHagNVFoj.A/Z.13JoOf04EYVEzgGrv3DtuW7RhOhHcXi', 'Teacher', 'Prof. Shahbaz Hussain', '03011110305', (SELECT dept_id FROM departments WHERE dept_code='AI'), 'TCH-AI-005', 'PhD'),
('prof.ayesha.ai@tria.com',  '$2b$12$IMdGr2vhxHagNVFoj.A/Z.13JoOf04EYVEzgGrv3DtuW7RhOhHcXi', 'Teacher', 'Prof. Ayesha Malik',    '03011110306', (SELECT dept_id FROM departments WHERE dept_code='AI'), 'TCH-AI-006', 'MS');

-- =========================================================
-- STEP 8: STUDENTS (30 per department = 120 total)
-- Password: student123 (bcrypt)
-- $2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy
-- =========================================================

-- ---- CS Students (30) ----
SET @cs_prog = (SELECT program_id FROM programs WHERE program_code='BS-CS');
SET @cs_sem  = (SELECT sem_id FROM semesters WHERE program_id=@cs_prog AND is_active=TRUE LIMIT 1);
SET @cs_dept = (SELECT dept_id FROM departments WHERE dept_code='CS');

INSERT INTO users (email, password, role, full_name, phone, dept_id, registration_no, program_id, current_sem_id) VALUES
('ali.raza.cs@student.com',       '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Ali Raza',          '03021110001',@cs_dept,'2024-CS-001',@cs_prog,@cs_sem),
('sara.khan.cs@student.com',      '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Sara Khan',         '03021110002',@cs_dept,'2024-CS-002',@cs_prog,@cs_sem),
('zain.ahmed.cs@student.com',     '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Zain Ahmed',        '03021110003',@cs_dept,'2024-CS-003',@cs_prog,@cs_sem),
('maham.cs@student.com',          '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Maham Tariq',       '03021110004',@cs_dept,'2024-CS-004',@cs_prog,@cs_sem),
('usman.cs@student.com',          '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Usman Akhtar',      '03021110005',@cs_dept,'2024-CS-005',@cs_prog,@cs_sem),
('ayesha.cs@student.com',         '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Ayesha Noor',       '03021110006',@cs_dept,'2024-CS-006',@cs_prog,@cs_sem),
('danish.cs@student.com',         '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Danish Mehmood',    '03021110007',@cs_dept,'2024-CS-007',@cs_prog,@cs_sem),
('hira.cs@student.com',           '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Hira Fatima',       '03021110008',@cs_dept,'2024-CS-008',@cs_prog,@cs_sem),
('bilal.cs@student.com',          '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Bilal Yousuf',      '03021110009',@cs_dept,'2024-CS-009',@cs_prog,@cs_sem),
('fatima.cs@student.com',         '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Fatima Hassan',     '03021110010',@cs_dept,'2024-CS-010',@cs_prog,@cs_sem),
('hamza.cs@student.com',          '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Hamza Ali',         '03021110011',@cs_dept,'2024-CS-011',@cs_prog,@cs_sem),
('sobia.cs@student.com',          '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Sobia Malik',       '03021110012',@cs_dept,'2024-CS-012',@cs_prog,@cs_sem),
('rehan.cs@student.com',          '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Rehan Shahid',      '03021110013',@cs_dept,'2024-CS-013',@cs_prog,@cs_sem),
('amna.cs@student.com',           '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Amna Butt',         '03021110014',@cs_dept,'2024-CS-014',@cs_prog,@cs_sem),
('kamran.cs@student.com',         '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Kamran Aslam',      '03021110015',@cs_dept,'2024-CS-015',@cs_prog,@cs_sem),
('iqra.cs@student.com',           '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Iqra Saleem',       '03021110016',@cs_dept,'2024-CS-016',@cs_prog,@cs_sem),
('fahad.cs@student.com',          '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Fahad Iqbal',       '03021110017',@cs_dept,'2024-CS-017',@cs_prog,@cs_sem),
('rimsha.cs@student.com',         '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Rimsha Zafar',      '03021110018',@cs_dept,'2024-CS-018',@cs_prog,@cs_sem),
('adeel.cs@student.com',          '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Adeel Anwar',       '03021110019',@cs_dept,'2024-CS-019',@cs_prog,@cs_sem),
('nida.cs@student.com',           '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Nida Rashid',       '03021110020',@cs_dept,'2024-CS-020',@cs_prog,@cs_sem),
('talha.cs@student.com',          '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Talha Rao',         '03021110021',@cs_dept,'2024-CS-021',@cs_prog,@cs_sem),
('rayyan.cs@student.com',         '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Rayyan Ahmed',      '03021110022',@cs_dept,'2024-CS-022',@cs_prog,@cs_sem),
('zara.cs@student.com',           '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Zara Maqbool',      '03021110023',@cs_dept,'2024-CS-023',@cs_prog,@cs_sem),
('faisal.cs@student.com',         '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Faisal Nawaz',      '03021110024',@cs_dept,'2024-CS-024',@cs_prog,@cs_sem),
('laiba.cs@student.com',          '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Laiba Arshad',      '03021110025',@cs_dept,'2024-CS-025',@cs_prog,@cs_sem),
('asim.cs@student.com',           '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Asim Javed',        '03021110026',@cs_dept,'2024-CS-026',@cs_prog,@cs_sem),
('mariam.cs@student.com',         '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Mariam Qazi',       '03021110027',@cs_dept,'2024-CS-027',@cs_prog,@cs_sem),
('omar.cs@student.com',           '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Omar Farooq',       '03021110028',@cs_dept,'2024-CS-028',@cs_prog,@cs_sem),
('huma.cs@student.com',           '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Huma Shafiq',       '03021110029',@cs_dept,'2024-CS-029',@cs_prog,@cs_sem),
('nabeel.cs@student.com',         '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Nabeel Chaudhry',   '03021110030',@cs_dept,'2024-CS-030',@cs_prog,@cs_sem);

-- ---- IT Students (30) ----
SET @it_prog = (SELECT program_id FROM programs WHERE program_code='BS-IT');
SET @it_sem  = (SELECT sem_id FROM semesters WHERE program_id=@it_prog AND is_active=TRUE LIMIT 1);
SET @it_dept = (SELECT dept_id FROM departments WHERE dept_code='IT');

INSERT INTO users (email, password, role, full_name, phone, dept_id, registration_no, program_id, current_sem_id) VALUES
('hamza.ali.it@student.com',      '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Hamza Ali',         '03021110101',@it_dept,'2024-IT-001',@it_prog,@it_sem),
('fatima.it@student.com',         '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Fatima Hassan',     '03021110102',@it_dept,'2024-IT-002',@it_prog,@it_sem),
('bilal.it@student.com',          '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Bilal Yousuf',      '03021110103',@it_dept,'2024-IT-003',@it_prog,@it_sem),
('sobia.it@student.com',          '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Sobia Malik',       '03021110104',@it_dept,'2024-IT-004',@it_prog,@it_sem),
('rehan.it@student.com',          '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Rehan Shahid',      '03021110105',@it_dept,'2024-IT-005',@it_prog,@it_sem),
('amna.it@student.com',           '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Amna Butt',         '03021110106',@it_dept,'2024-IT-006',@it_prog,@it_sem),
('kamran.it@student.com',         '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Kamran Aslam',      '03021110107',@it_dept,'2024-IT-007',@it_prog,@it_sem),
('iqra.it@student.com',           '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Iqra Saleem',       '03021110108',@it_dept,'2024-IT-008',@it_prog,@it_sem),
('fahad.it@student.com',          '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Fahad Iqbal',       '03021110109',@it_dept,'2024-IT-009',@it_prog,@it_sem),
('rimsha.it@student.com',         '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Rimsha Zafar',      '03021110110',@it_dept,'2024-IT-010',@it_prog,@it_sem),
('adeel.it@student.com',          '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Adeel Anwar',       '03021110111',@it_dept,'2024-IT-011',@it_prog,@it_sem),
('nida.it@student.com',           '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Nida Rashid',       '03021110112',@it_dept,'2024-IT-012',@it_prog,@it_sem),
('talha.it@student.com',          '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Talha Rao',         '03021110113',@it_dept,'2024-IT-013',@it_prog,@it_sem),
('rayyan.it@student.com',         '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Rayyan Ahmed',      '03021110114',@it_dept,'2024-IT-014',@it_prog,@it_sem),
('zara.it@student.com',           '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Zara Maqbool',      '03021110115',@it_dept,'2024-IT-015',@it_prog,@it_sem),
('faisal.it@student.com',         '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Faisal Nawaz',      '03021110116',@it_dept,'2024-IT-016',@it_prog,@it_sem),
('laiba.it@student.com',          '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Laiba Arshad',      '03021110117',@it_dept,'2024-IT-017',@it_prog,@it_sem),
('asim.it@student.com',           '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Asim Javed',        '03021110118',@it_dept,'2024-IT-018',@it_prog,@it_sem),
('mariam.it@student.com',         '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Mariam Qazi',       '03021110119',@it_dept,'2024-IT-019',@it_prog,@it_sem),
('omar.it@student.com',           '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Omar Farooq',       '03021110120',@it_dept,'2024-IT-020',@it_prog,@it_sem),
('huma.it@student.com',           '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Huma Shafiq',       '03021110121',@it_dept,'2024-IT-021',@it_prog,@it_sem),
('nabeel.it@student.com',         '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Nabeel Chaudhry',   '03021110122',@it_dept,'2024-IT-022',@it_prog,@it_sem),
('ali.it@student.com',            '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Ali Raza',          '03021110123',@it_dept,'2024-IT-023',@it_prog,@it_sem),
('sara.it@student.com',           '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Sara Khan',         '03021110124',@it_dept,'2024-IT-024',@it_prog,@it_sem),
('zain.it@student.com',           '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Zain Ahmed',        '03021110125',@it_dept,'2024-IT-025',@it_prog,@it_sem),
('maham.it@student.com',          '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Maham Tariq',       '03021110126',@it_dept,'2024-IT-026',@it_prog,@it_sem),
('danish.it@student.com',         '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Danish Mehmood',    '03021110127',@it_dept,'2024-IT-027',@it_prog,@it_sem),
('hira.it@student.com',           '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Hira Fatima',       '03021110128',@it_dept,'2024-IT-028',@it_prog,@it_sem),
('usman.it@student.com',          '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Usman Akhtar',      '03021110129',@it_dept,'2024-IT-029',@it_prog,@it_sem),
('ayesha.it@student.com',         '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Ayesha Noor',       '03021110130',@it_dept,'2024-IT-030',@it_prog,@it_sem);

-- ---- SE Students (30) ----
SET @se_prog = (SELECT program_id FROM programs WHERE program_code='BS-SE');
SET @se_sem  = (SELECT sem_id FROM semesters WHERE program_id=@se_prog AND is_active=TRUE LIMIT 1);
SET @se_dept = (SELECT dept_id FROM departments WHERE dept_code='SE');

INSERT INTO users (email, password, role, full_name, phone, dept_id, registration_no, program_id, current_sem_id) VALUES
('manahil.se@student.com',        '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Manahil Rauf',      '03021110201',@se_dept,'2024-SE-001',@se_prog,@se_sem),
('hassan.se@student.com',         '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Hassan Raza',       '03021110202',@se_dept,'2024-SE-002',@se_prog,@se_sem),
('iqra.se@student.com',           '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Iqra Saleem',       '03021110203',@se_dept,'2024-SE-003',@se_prog,@se_sem),
('fahad.se@student.com',          '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Fahad Iqbal',       '03021110204',@se_dept,'2024-SE-004',@se_prog,@se_sem),
('rimsha.se@student.com',         '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Rimsha Zafar',      '03021110205',@se_dept,'2024-SE-005',@se_prog,@se_sem),
('adeel.se@student.com',          '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Adeel Anwar',       '03021110206',@se_dept,'2024-SE-006',@se_prog,@se_sem),
('nida.se@student.com',           '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Nida Rashid',       '03021110207',@se_dept,'2024-SE-007',@se_prog,@se_sem),
('talha.se@student.com',          '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Talha Rao',         '03021110208',@se_dept,'2024-SE-008',@se_prog,@se_sem),
('rayyan.se@student.com',         '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Rayyan Ahmed',      '03021110209',@se_dept,'2024-SE-009',@se_prog,@se_sem),
('zara.se@student.com',           '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Zara Maqbool',      '03021110210',@se_dept,'2024-SE-010',@se_prog,@se_sem),
('faisal.se@student.com',         '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Faisal Nawaz',      '03021110211',@se_dept,'2024-SE-011',@se_prog,@se_sem),
('laiba.se@student.com',          '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Laiba Arshad',      '03021110212',@se_dept,'2024-SE-012',@se_prog,@se_sem),
('asim.se@student.com',           '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Asim Javed',        '03021110213',@se_dept,'2024-SE-013',@se_prog,@se_sem),
('mariam.se@student.com',         '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Mariam Qazi',       '03021110214',@se_dept,'2024-SE-014',@se_prog,@se_sem),
('omar.se@student.com',           '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Omar Farooq',       '03021110215',@se_dept,'2024-SE-015',@se_prog,@se_sem),
('huma.se@student.com',           '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Huma Shafiq',       '03021110216',@se_dept,'2024-SE-016',@se_prog,@se_sem),
('nabeel.se@student.com',         '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Nabeel Chaudhry',   '03021110217',@se_dept,'2024-SE-017',@se_prog,@se_sem),
('ali.se@student.com',            '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Ali Raza',          '03021110218',@se_dept,'2024-SE-018',@se_prog,@se_sem),
('sara.se@student.com',           '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Sara Khan',         '03021110219',@se_dept,'2024-SE-019',@se_prog,@se_sem),
('zain.se@student.com',           '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Zain Ahmed',        '03021110220',@se_dept,'2024-SE-020',@se_prog,@se_sem),
('maham.se@student.com',          '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Maham Tariq',       '03021110221',@se_dept,'2024-SE-021',@se_prog,@se_sem),
('usman.se@student.com',          '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Usman Akhtar',      '03021110222',@se_dept,'2024-SE-022',@se_prog,@se_sem),
('ayesha.se@student.com',         '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Ayesha Noor',       '03021110223',@se_dept,'2024-SE-023',@se_prog,@se_sem),
('danish.se@student.com',         '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Danish Mehmood',    '03021110224',@se_dept,'2024-SE-024',@se_prog,@se_sem),
('hira.se@student.com',           '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Hira Fatima',       '03021110225',@se_dept,'2024-SE-025',@se_prog,@se_sem),
('bilal.se@student.com',          '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Bilal Yousuf',      '03021110226',@se_dept,'2024-SE-026',@se_prog,@se_sem),
('fatima.se@student.com',         '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Fatima Hassan',     '03021110227',@se_dept,'2024-SE-027',@se_prog,@se_sem),
('hamza.se@student.com',          '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Hamza Ali',         '03021110228',@se_dept,'2024-SE-028',@se_prog,@se_sem),
('kamran.se@student.com',         '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Kamran Aslam',      '03021110229',@se_dept,'2024-SE-029',@se_prog,@se_sem),
('amna.se@student.com',           '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Amna Butt',         '03021110230',@se_dept,'2024-SE-030',@se_prog,@se_sem);

-- ---- AI Students (30) ----
SET @ai_prog = (SELECT program_id FROM programs WHERE program_code='BS-AI');
SET @ai_sem  = (SELECT sem_id FROM semesters WHERE program_id=@ai_prog AND is_active=TRUE LIMIT 1);
SET @ai_dept = (SELECT dept_id FROM departments WHERE dept_code='AI');

INSERT INTO users (email, password, role, full_name, phone, dept_id, registration_no, program_id, current_sem_id) VALUES
('rayyan.ai@student.com',         '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Rayyan Ahmed',      '03021110301',@ai_dept,'2024-AI-001',@ai_prog,@ai_sem),
('zara.ai@student.com',           '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Zara Maqbool',      '03021110302',@ai_dept,'2024-AI-002',@ai_prog,@ai_sem),
('faisal.ai@student.com',         '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Faisal Nawaz',      '03021110303',@ai_dept,'2024-AI-003',@ai_prog,@ai_sem),
('sana.ai@student.com',           '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Sana Ijaz',         '03021110304',@ai_dept,'2024-AI-004',@ai_prog,@ai_sem),
('omar.ai@student.com',           '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Omar Farooq',       '03021110305',@ai_dept,'2024-AI-005',@ai_prog,@ai_sem),
('laiba.ai@student.com',          '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Laiba Arshad',      '03021110306',@ai_dept,'2024-AI-006',@ai_prog,@ai_sem),
('asim.ai@student.com',           '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Asim Javed',        '03021110307',@ai_dept,'2024-AI-007',@ai_prog,@ai_sem),
('mariam.ai@student.com',         '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Mariam Qazi',       '03021110308',@ai_dept,'2024-AI-008',@ai_prog,@ai_sem),
('nabeel.ai@student.com',         '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Nabeel Chaudhry',   '03021110309',@ai_dept,'2024-AI-009',@ai_prog,@ai_sem),
('ali.ai@student.com',            '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Ali Raza',          '03021110310',@ai_dept,'2024-AI-010',@ai_prog,@ai_sem),
('sara.ai@student.com',           '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Sara Khan',         '03021110311',@ai_dept,'2024-AI-011',@ai_prog,@ai_sem),
('zain.ai@student.com',           '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Zain Ahmed',        '03021110312',@ai_dept,'2024-AI-012',@ai_prog,@ai_sem),
('maham.ai@student.com',          '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Maham Tariq',       '03021110313',@ai_dept,'2024-AI-013',@ai_prog,@ai_sem),
('usman.ai@student.com',          '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Usman Akhtar',      '03021110314',@ai_dept,'2024-AI-014',@ai_prog,@ai_sem),
('ayesha.ai@student.com',         '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Ayesha Noor',       '03021110315',@ai_dept,'2024-AI-015',@ai_prog,@ai_sem),
('danish.ai@student.com',         '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Danish Mehmood',    '03021110316',@ai_dept,'2024-AI-016',@ai_prog,@ai_sem),
('hira.ai@student.com',           '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Hira Fatima',       '03021110317',@ai_dept,'2024-AI-017',@ai_prog,@ai_sem),
('bilal.ai@student.com',          '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Bilal Yousuf',      '03021110318',@ai_dept,'2024-AI-018',@ai_prog,@ai_sem),
('fatima.ai@student.com',         '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Fatima Hassan',     '03021110319',@ai_dept,'2024-AI-019',@ai_prog,@ai_sem),
('hamza.ai@student.com',          '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Hamza Ali',         '03021110320',@ai_dept,'2024-AI-020',@ai_prog,@ai_sem),
('sobia.ai@student.com',          '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Sobia Malik',       '03021110321',@ai_dept,'2024-AI-021',@ai_prog,@ai_sem),
('rehan.ai@student.com',          '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Rehan Shahid',      '03021110322',@ai_dept,'2024-AI-022',@ai_prog,@ai_sem),
('amna.ai@student.com',           '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Amna Butt',         '03021110323',@ai_dept,'2024-AI-023',@ai_prog,@ai_sem),
('kamran.ai@student.com',         '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Kamran Aslam',      '03021110324',@ai_dept,'2024-AI-024',@ai_prog,@ai_sem),
('iqra.ai@student.com',           '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Iqra Saleem',       '03021110325',@ai_dept,'2024-AI-025',@ai_prog,@ai_sem),
('fahad.ai@student.com',          '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Fahad Iqbal',       '03021110326',@ai_dept,'2024-AI-026',@ai_prog,@ai_sem),
('rimsha.ai@student.com',         '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Rimsha Zafar',      '03021110327',@ai_dept,'2024-AI-027',@ai_prog,@ai_sem),
('adeel.ai@student.com',          '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Adeel Anwar',       '03021110328',@ai_dept,'2024-AI-028',@ai_prog,@ai_sem),
('nida.ai@student.com',           '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Nida Rashid',       '03021110329',@ai_dept,'2024-AI-029',@ai_prog,@ai_sem),
('talha.ai@student.com',          '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy','Student','Talha Rao',         '03021110330',@ai_dept,'2024-AI-030',@ai_prog,@ai_sem);

-- =========================================================
-- STEP 9: SECTIONS
-- Assignment: 1 teacher per course (teaches both A & B)
--   CS101-CS102: TCH-CS-001  CS103-CS104: TCH-CS-002  CS105: TCH-CS-003
--   IT101-IT102: TCH-IT-001  IT103-IT104: TCH-IT-002  IT105: TCH-IT-003
--   SE101-SE102: TCH-SE-001  SE103-SE104: TCH-SE-002  SE105: TCH-SE-003
--   AI101-AI102: TCH-AI-001  AI103-AI104: TCH-AI-002  AI105: TCH-AI-003
-- =========================================================
INSERT INTO sections (cs_id, section_code, teacher_id, room_no, capacity, enrolled_count, is_active)
SELECT
    cs.cs_id,
    sec_code,
    CASE c.course_code
        WHEN 'CS101' THEN (SELECT user_id FROM users WHERE employee_id='TCH-CS-001')
        WHEN 'CS102' THEN (SELECT user_id FROM users WHERE employee_id='TCH-CS-001')
        WHEN 'CS103' THEN (SELECT user_id FROM users WHERE employee_id='TCH-CS-002')
        WHEN 'CS104' THEN (SELECT user_id FROM users WHERE employee_id='TCH-CS-002')
        WHEN 'CS105' THEN (SELECT user_id FROM users WHERE employee_id='TCH-CS-003')
        WHEN 'IT101' THEN (SELECT user_id FROM users WHERE employee_id='TCH-IT-001')
        WHEN 'IT102' THEN (SELECT user_id FROM users WHERE employee_id='TCH-IT-001')
        WHEN 'IT103' THEN (SELECT user_id FROM users WHERE employee_id='TCH-IT-002')
        WHEN 'IT104' THEN (SELECT user_id FROM users WHERE employee_id='TCH-IT-002')
        WHEN 'IT105' THEN (SELECT user_id FROM users WHERE employee_id='TCH-IT-003')
        WHEN 'SE101' THEN (SELECT user_id FROM users WHERE employee_id='TCH-SE-001')
        WHEN 'SE102' THEN (SELECT user_id FROM users WHERE employee_id='TCH-SE-001')
        WHEN 'SE103' THEN (SELECT user_id FROM users WHERE employee_id='TCH-SE-002')
        WHEN 'SE104' THEN (SELECT user_id FROM users WHERE employee_id='TCH-SE-002')
        WHEN 'SE105' THEN (SELECT user_id FROM users WHERE employee_id='TCH-SE-003')
        WHEN 'AI101' THEN (SELECT user_id FROM users WHERE employee_id='TCH-AI-001')
        WHEN 'AI102' THEN (SELECT user_id FROM users WHERE employee_id='TCH-AI-001')
        WHEN 'AI103' THEN (SELECT user_id FROM users WHERE employee_id='TCH-AI-002')
        WHEN 'AI104' THEN (SELECT user_id FROM users WHERE employee_id='TCH-AI-002')
        WHEN 'AI105' THEN (SELECT user_id FROM users WHERE employee_id='TCH-AI-003')
    END,
    CONCAT('Room-', c.course_code, '-', sec_code),
    20, 0, TRUE
FROM course_semester cs
JOIN courses c ON c.course_id = cs.course_id
CROSS JOIN (SELECT 'A' AS sec_code UNION SELECT 'B') sections_list;

-- =========================================================
-- STEP 10: ENROLL STUDENTS INTO SECTIONS
-- First 15 students (odd reg numbers end) → Section A
-- Last 15 students (even reg numbers end) → Section B
-- Using ROW_NUMBER logic via user_id order within each dept
-- =========================================================
INSERT INTO student_enrollment (student_id, section_id)
SELECT DISTINCT u.user_id, sec.section_id
FROM users u
JOIN programs p ON p.program_id = u.program_id
JOIN courses c ON c.dept_id = p.dept_id
JOIN course_semester cs ON cs.course_id = c.course_id
JOIN sections sec ON sec.cs_id = cs.cs_id
WHERE u.role = 'Student'
  AND (
      (MOD(
          (SELECT COUNT(*) FROM users u2
           WHERE u2.role='Student' AND u2.dept_id=u.dept_id AND u2.user_id <= u.user_id)
      , 2) = 1 AND sec.section_code = 'A')
      OR
      (MOD(
          (SELECT COUNT(*) FROM users u2
           WHERE u2.role='Student' AND u2.dept_id=u.dept_id AND u2.user_id <= u.user_id)
      , 2) = 0 AND sec.section_code = 'B')
  )
  AND NOT EXISTS (
      SELECT 1 FROM student_enrollment se2
      WHERE se2.student_id = u.user_id AND se2.section_id = sec.section_id
  );

-- =========================================================
-- STEP 11: UPDATE enrolled_count
-- =========================================================
SET SQL_SAFE_UPDATES = 0;
UPDATE sections sec
SET enrolled_count = (
    SELECT COUNT(*) FROM student_enrollment se WHERE se.section_id = sec.section_id
);
SET SQL_SAFE_UPDATES = 1;

-- =========================================================
-- STEP 12: PAST SESSIONS (30 days per section)
-- =========================================================
DROP TEMPORARY TABLE IF EXISTS day_offsets;
CREATE TEMPORARY TABLE day_offsets (d INT);
INSERT INTO day_offsets VALUES
(1),(2),(3),(4),(5),(6),(7),(8),(9),(10),
(11),(12),(13),(14),(15),(16),(17),(18),(19),(20),
(21),(22),(23),(24),(25),(26),(27),(28),(29),(30);

-- Past closed sessions
INSERT INTO attendance_sessions (section_id, teacher_id, session_date, start_time, end_time, session_token, mode, is_active)
SELECT
    sec.section_id,
    sec.teacher_id,
    DATE_SUB(CURDATE(), INTERVAL do_.d DAY),
    CONCAT(DATE_SUB(CURDATE(), INTERVAL do_.d DAY), ' 09:00:00'),
    CONCAT(DATE_SUB(CURDATE(), INTERVAL do_.d DAY), ' 10:00:00'),
    UUID(), 'Hybrid', FALSE
FROM sections sec
CROSS JOIN day_offsets do_
WHERE NOT EXISTS (
    SELECT 1 FROM attendance_sessions s2
    WHERE s2.section_id = sec.section_id
      AND s2.session_date = DATE_SUB(CURDATE(), INTERVAL do_.d DAY)
);

-- Today's active sessions
INSERT INTO attendance_sessions (section_id, teacher_id, session_date, start_time, session_token, mode, is_active)
SELECT sec.section_id, sec.teacher_id, CURDATE(), NOW(), UUID(), 'Hybrid', TRUE
FROM sections sec
WHERE NOT EXISTS (
    SELECT 1 FROM attendance_sessions s2
    WHERE s2.section_id = sec.section_id AND s2.session_date = CURDATE() AND s2.is_active = TRUE
);

-- =========================================================
-- STEP 13: BASELINE — ALL students Present for all past sessions
-- =========================================================
INSERT INTO attendance_records (session_id, student_id, section_id, attendance_date, mode, status, sync_status, marked_at)
SELECT s.session_id, se.student_id, s.section_id, s.session_date, 'QR', 'Present', 'Synced', NOW()
FROM attendance_sessions s
JOIN student_enrollment se ON se.section_id = s.section_id
WHERE s.is_active = FALSE
  AND NOT EXISTS (
      SELECT 1 FROM attendance_records ar
      WHERE ar.session_id = s.session_id AND ar.student_id = se.student_id
  );

-- =========================================================
-- STEP 14: OVERRIDE — LOW ATTENDANCE STUDENTS
-- Target: 15+ students below 75% in various courses
-- Each student gets different absent ranges for realistic mixed data
-- =========================================================
SET SQL_SAFE_UPDATES = 0;

-- ---- CS LOW ATTENDANCE (4 students) ----

-- ali.raza.cs: CS101 → absent days 3-30 = ~7% attendance
UPDATE attendance_records ar
JOIN attendance_sessions s ON s.session_id = ar.session_id
JOIN sections sec ON sec.section_id = s.section_id
JOIN course_semester cs ON cs.cs_id = sec.cs_id
JOIN courses c ON c.course_id = cs.course_id
SET ar.status = 'Absent', ar.mode = 'Manual'
WHERE ar.student_id = (SELECT user_id FROM users WHERE email='ali.raza.cs@student.com')
  AND c.course_code = 'CS101' AND s.is_active = FALSE
  AND s.session_date <= DATE_SUB(CURDATE(), INTERVAL 3 DAY);

-- usman.cs: CS103 → absent days 5-30 = ~17% attendance
UPDATE attendance_records ar
JOIN attendance_sessions s ON s.session_id = ar.session_id
JOIN sections sec ON sec.section_id = s.section_id
JOIN course_semester cs ON cs.cs_id = sec.cs_id
JOIN courses c ON c.course_id = cs.course_id
SET ar.status = 'Absent', ar.mode = 'Manual'
WHERE ar.student_id = (SELECT user_id FROM users WHERE email='usman.cs@student.com')
  AND c.course_code = 'CS103' AND s.is_active = FALSE
  AND s.session_date <= DATE_SUB(CURDATE(), INTERVAL 5 DAY);

-- danish.cs: CS102 → absent days 8-30 = ~27% attendance
UPDATE attendance_records ar
JOIN attendance_sessions s ON s.session_id = ar.session_id
JOIN sections sec ON sec.section_id = s.section_id
JOIN course_semester cs ON cs.cs_id = sec.cs_id
JOIN courses c ON c.course_id = cs.course_id
SET ar.status = 'Absent', ar.mode = 'Manual'
WHERE ar.student_id = (SELECT user_id FROM users WHERE email='danish.cs@student.com')
  AND c.course_code = 'CS102' AND s.is_active = FALSE
  AND s.session_date <= DATE_SUB(CURDATE(), INTERVAL 8 DAY);

-- kamran.cs: CS104 → absent days 12-30 = ~40% attendance
UPDATE attendance_records ar
JOIN attendance_sessions s ON s.session_id = ar.session_id
JOIN sections sec ON sec.section_id = s.section_id
JOIN course_semester cs ON cs.cs_id = sec.cs_id
JOIN courses c ON c.course_id = cs.course_id
SET ar.status = 'Absent', ar.mode = 'Manual'
WHERE ar.student_id = (SELECT user_id FROM users WHERE email='kamran.cs@student.com')
  AND c.course_code = 'CS104' AND s.is_active = FALSE
  AND s.session_date <= DATE_SUB(CURDATE(), INTERVAL 12 DAY);

-- ---- IT LOW ATTENDANCE (4 students) ----

-- hamza.ali.it: IT101 → absent days 4-30 = ~13% attendance
UPDATE attendance_records ar
JOIN attendance_sessions s ON s.session_id = ar.session_id
JOIN sections sec ON sec.section_id = s.section_id
JOIN course_semester cs ON cs.cs_id = sec.cs_id
JOIN courses c ON c.course_id = cs.course_id
SET ar.status = 'Absent', ar.mode = 'Manual'
WHERE ar.student_id = (SELECT user_id FROM users WHERE email='hamza.ali.it@student.com')
  AND c.course_code = 'IT101' AND s.is_active = FALSE
  AND s.session_date <= DATE_SUB(CURDATE(), INTERVAL 4 DAY);

-- rehan.it: IT103 → absent days 10-30 = ~33% attendance
UPDATE attendance_records ar
JOIN attendance_sessions s ON s.session_id = ar.session_id
JOIN sections sec ON sec.section_id = s.section_id
JOIN course_semester cs ON cs.cs_id = sec.cs_id
JOIN courses c ON c.course_id = cs.course_id
SET ar.status = 'Absent', ar.mode = 'Manual'
WHERE ar.student_id = (SELECT user_id FROM users WHERE email='rehan.it@student.com')
  AND c.course_code = 'IT103' AND s.is_active = FALSE
  AND s.session_date <= DATE_SUB(CURDATE(), INTERVAL 10 DAY);

-- bilal.it: IT102 → absent days 7-30 = ~23% attendance
UPDATE attendance_records ar
JOIN attendance_sessions s ON s.session_id = ar.session_id
JOIN sections sec ON sec.section_id = s.section_id
JOIN course_semester cs ON cs.cs_id = sec.cs_id
JOIN courses c ON c.course_id = cs.course_id
SET ar.status = 'Absent', ar.mode = 'Manual'
WHERE ar.student_id = (SELECT user_id FROM users WHERE email='bilal.it@student.com')
  AND c.course_code = 'IT102' AND s.is_active = FALSE
  AND s.session_date <= DATE_SUB(CURDATE(), INTERVAL 7 DAY);

-- kamran.it: IT104 → absent days 15-30 = ~50% attendance
UPDATE attendance_records ar
JOIN attendance_sessions s ON s.session_id = ar.session_id
JOIN sections sec ON sec.section_id = s.section_id
JOIN course_semester cs ON cs.cs_id = sec.cs_id
JOIN courses c ON c.course_id = cs.course_id
SET ar.status = 'Absent', ar.mode = 'Manual'
WHERE ar.student_id = (SELECT user_id FROM users WHERE email='kamran.it@student.com')
  AND c.course_code = 'IT104' AND s.is_active = FALSE
  AND s.session_date <= DATE_SUB(CURDATE(), INTERVAL 15 DAY);

-- ---- SE LOW ATTENDANCE (4 students) ----

-- iqra.se: SE102 → absent days 18-30 = ~60% attendance (borderline)
UPDATE attendance_records ar
JOIN attendance_sessions s ON s.session_id = ar.session_id
JOIN sections sec ON sec.section_id = s.section_id
JOIN course_semester cs ON cs.cs_id = sec.cs_id
JOIN courses c ON c.course_id = cs.course_id
SET ar.status = 'Absent', ar.mode = 'Manual'
WHERE ar.student_id = (SELECT user_id FROM users WHERE email='iqra.se@student.com')
  AND c.course_code = 'SE102' AND s.is_active = FALSE
  AND s.session_date <= DATE_SUB(CURDATE(), INTERVAL 18 DAY);

-- fahad.se: SE101 → absent days 6-30 = ~20% attendance
UPDATE attendance_records ar
JOIN attendance_sessions s ON s.session_id = ar.session_id
JOIN sections sec ON sec.section_id = s.section_id
JOIN course_semester cs ON cs.cs_id = sec.cs_id
JOIN courses c ON c.course_id = cs.course_id
SET ar.status = 'Absent', ar.mode = 'Manual'
WHERE ar.student_id = (SELECT user_id FROM users WHERE email='fahad.se@student.com')
  AND c.course_code = 'SE101' AND s.is_active = FALSE
  AND s.session_date <= DATE_SUB(CURDATE(), INTERVAL 6 DAY);

-- talha.se: SE103 → absent days 9-30 = ~30% attendance
UPDATE attendance_records ar
JOIN attendance_sessions s ON s.session_id = ar.session_id
JOIN sections sec ON sec.section_id = s.section_id
JOIN course_semester cs ON cs.cs_id = sec.cs_id
JOIN courses c ON c.course_id = cs.course_id
SET ar.status = 'Absent', ar.mode = 'Manual'
WHERE ar.student_id = (SELECT user_id FROM users WHERE email='talha.se@student.com')
  AND c.course_code = 'SE103' AND s.is_active = FALSE
  AND s.session_date <= DATE_SUB(CURDATE(), INTERVAL 9 DAY);

-- manahil.se: SE104 → absent days 13-30 = ~43% attendance
UPDATE attendance_records ar
JOIN attendance_sessions s ON s.session_id = ar.session_id
JOIN sections sec ON sec.section_id = s.section_id
JOIN course_semester cs ON cs.cs_id = sec.cs_id
JOIN courses c ON c.course_id = cs.course_id
SET ar.status = 'Absent', ar.mode = 'Manual'
WHERE ar.student_id = (SELECT user_id FROM users WHERE email='manahil.se@student.com')
  AND c.course_code = 'SE104' AND s.is_active = FALSE
  AND s.session_date <= DATE_SUB(CURDATE(), INTERVAL 13 DAY);

-- ---- AI LOW ATTENDANCE (4 students) ----

-- faisal.ai: AI101 → absent days 5-30 = ~17% attendance
UPDATE attendance_records ar
JOIN attendance_sessions s ON s.session_id = ar.session_id
JOIN sections sec ON sec.section_id = s.section_id
JOIN course_semester cs ON cs.cs_id = sec.cs_id
JOIN courses c ON c.course_id = cs.course_id
SET ar.status = 'Absent', ar.mode = 'Manual'
WHERE ar.student_id = (SELECT user_id FROM users WHERE email='faisal.ai@student.com')
  AND c.course_code = 'AI101' AND s.is_active = FALSE
  AND s.session_date <= DATE_SUB(CURDATE(), INTERVAL 5 DAY);

-- sana.ai: AI103 → absent days 15-30 = ~50% attendance
UPDATE attendance_records ar
JOIN attendance_sessions s ON s.session_id = ar.session_id
JOIN sections sec ON sec.section_id = s.section_id
JOIN course_semester cs ON cs.cs_id = sec.cs_id
JOIN courses c ON c.course_id = cs.course_id
SET ar.status = 'Absent', ar.mode = 'Manual'
WHERE ar.student_id = (SELECT user_id FROM users WHERE email='sana.ai@student.com')
  AND c.course_code = 'AI103' AND s.is_active = FALSE
  AND s.session_date <= DATE_SUB(CURDATE(), INTERVAL 15 DAY);

-- omar.ai: AI102 → absent days 7-30 = ~23% attendance
UPDATE attendance_records ar
JOIN attendance_sessions s ON s.session_id = ar.session_id
JOIN sections sec ON sec.section_id = s.section_id
JOIN course_semester cs ON cs.cs_id = sec.cs_id
JOIN courses c ON c.course_id = cs.course_id
SET ar.status = 'Absent', ar.mode = 'Manual'
WHERE ar.student_id = (SELECT user_id FROM users WHERE email='omar.ai@student.com')
  AND c.course_code = 'AI102' AND s.is_active = FALSE
  AND s.session_date <= DATE_SUB(CURDATE(), INTERVAL 7 DAY);

-- laiba.ai: AI105 → absent days 11-30 = ~37% attendance
UPDATE attendance_records ar
JOIN attendance_sessions s ON s.session_id = ar.session_id
JOIN sections sec ON sec.section_id = s.section_id
JOIN course_semester cs ON cs.cs_id = sec.cs_id
JOIN courses c ON c.course_id = cs.course_id
SET ar.status = 'Absent', ar.mode = 'Manual'
WHERE ar.student_id = (SELECT user_id FROM users WHERE email='laiba.ai@student.com')
  AND c.course_code = 'AI105' AND s.is_active = FALSE
  AND s.session_date <= DATE_SUB(CURDATE(), INTERVAL 11 DAY);

SET SQL_SAFE_UPDATES = 1;

-- =========================================================
-- STEP 15: FINES (16 students below 75%)
-- =========================================================
INSERT INTO fines (student_id, course_code, course_name, attendance_percentage, fine_amount, status, issued_date, paid_date)
VALUES
-- CS fines
((SELECT user_id FROM users WHERE email='ali.raza.cs@student.com'),
 'CS101','Programming Fundamentals', 7.00, 1000.00,'Pending', NOW(), NULL),

((SELECT user_id FROM users WHERE email='usman.cs@student.com'),
 'CS103','Data Structures', 17.00, 1000.00,'Pending', NOW(), NULL),

((SELECT user_id FROM users WHERE email='danish.cs@student.com'),
 'CS102','Object Oriented Programming', 27.00, 500.00,'Pending', NOW(), NULL),

((SELECT user_id FROM users WHERE email='kamran.cs@student.com'),
 'CS104','Database Systems', 40.00, 500.00,'Paid',
 DATE_SUB(NOW(), INTERVAL 20 DAY), DATE_SUB(NOW(), INTERVAL 5 DAY)),

-- IT fines
((SELECT user_id FROM users WHERE email='hamza.ali.it@student.com'),
 'IT101','Web Technologies', 13.00, 1000.00,'Pending', NOW(), NULL),

((SELECT user_id FROM users WHERE email='bilal.it@student.com'),
 'IT102','Network Administration', 23.00, 500.00,'Pending', NOW(), NULL),

((SELECT user_id FROM users WHERE email='rehan.it@student.com'),
 'IT103','System Analysis & Design', 33.00, 500.00,'Paid',
 DATE_SUB(NOW(), INTERVAL 15 DAY), DATE_SUB(NOW(), INTERVAL 3 DAY)),

((SELECT user_id FROM users WHERE email='kamran.it@student.com'),
 'IT104','Cloud Computing', 50.00, 500.00,'Pending', NOW(), NULL),

-- SE fines
((SELECT user_id FROM users WHERE email='fahad.se@student.com'),
 'SE101','Software Fundamentals', 20.00, 1000.00,'Pending', NOW(), NULL),

((SELECT user_id FROM users WHERE email='talha.se@student.com'),
 'SE103','Software Testing & QA', 30.00, 500.00,'Pending', NOW(), NULL),

((SELECT user_id FROM users WHERE email='manahil.se@student.com'),
 'SE104','Agile Methodologies', 43.00, 500.00,'Paid',
 DATE_SUB(NOW(), INTERVAL 10 DAY), DATE_SUB(NOW(), INTERVAL 2 DAY)),

((SELECT user_id FROM users WHERE email='iqra.se@student.com'),
 'SE102','Software Design Patterns', 60.00, 500.00,'Pending', NOW(), NULL),

-- AI fines
((SELECT user_id FROM users WHERE email='faisal.ai@student.com'),
 'AI101','Introduction to AI', 17.00, 1000.00,'Pending', NOW(), NULL),

((SELECT user_id FROM users WHERE email='omar.ai@student.com'),
 'AI102','Machine Learning', 23.00, 500.00,'Pending', NOW(), NULL),

((SELECT user_id FROM users WHERE email='laiba.ai@student.com'),
 'AI105','Computer Vision', 37.00, 500.00,'Paid',
 DATE_SUB(NOW(), INTERVAL 12 DAY), DATE_SUB(NOW(), INTERVAL 1 DAY)),

((SELECT user_id FROM users WHERE email='sana.ai@student.com'),
 'AI103','Deep Learning', 50.00, 500.00,'Pending', NOW(), NULL);

-- =========================================================
-- STEP 16: ADMIN DASHBOARD VIEWS
-- =========================================================

CREATE OR REPLACE VIEW v_admin_all_students AS
SELECT
    u.user_id, u.registration_no, u.full_name, u.email, u.phone,
    d.dept_name, d.dept_code, p.program_name, p.program_code,
    sem.semester_name AS current_semester,
    u.created_at AS enrolled_on,
    COALESCE(ROUND(
        SUM(CASE WHEN ar.status='Present' THEN 1 ELSE 0 END) /
        NULLIF(COUNT(ar.record_id),0) * 100, 2), 0) AS overall_attendance_pct,
    CASE
        WHEN COALESCE(ROUND(SUM(CASE WHEN ar.status='Present' THEN 1 ELSE 0 END)/NULLIF(COUNT(ar.record_id),0)*100,2),100) < 75
        THEN 'At Risk' ELSE 'Good Standing'
    END AS attendance_status
FROM users u
JOIN departments d ON d.dept_id = u.dept_id
JOIN programs p ON p.program_id = u.program_id
JOIN semesters sem ON sem.sem_id = u.current_sem_id
LEFT JOIN student_enrollment se ON se.student_id = u.user_id
LEFT JOIN attendance_records ar ON ar.student_id = u.user_id AND ar.section_id = se.section_id
WHERE u.role = 'Student'
GROUP BY u.user_id, u.registration_no, u.full_name, u.email, u.phone,
         d.dept_name, d.dept_code, p.program_name, p.program_code, sem.semester_name, u.created_at
ORDER BY d.dept_code, u.registration_no;

CREATE OR REPLACE VIEW v_admin_all_teachers AS
SELECT
    u.user_id, u.employee_id, u.full_name, u.email, u.phone,
    d.dept_name, d.dept_code, u.qualification,
    COUNT(DISTINCT sec.section_id) AS sections_assigned,
    COUNT(DISTINCT s.session_id)   AS total_sessions_conducted
FROM users u
JOIN departments d ON d.dept_id = u.dept_id
LEFT JOIN sections sec ON sec.teacher_id = u.user_id
LEFT JOIN attendance_sessions s ON s.teacher_id = u.user_id
WHERE u.role = 'Teacher'
GROUP BY u.user_id, u.employee_id, u.full_name, u.email, u.phone,
         d.dept_name, d.dept_code, u.qualification
ORDER BY d.dept_code, u.full_name;

CREATE OR REPLACE VIEW v_admin_fines AS
SELECT
    f.fine_id, u.full_name AS student_name, u.registration_no, u.email,
    d.dept_name, d.dept_code, f.course_code, f.course_name,
    f.attendance_percentage, f.fine_amount, f.status, f.issued_date, f.paid_date
FROM fines f
JOIN users u ON u.user_id = f.student_id
JOIN departments d ON d.dept_id = u.dept_id
ORDER BY f.status DESC, f.issued_date DESC;

CREATE OR REPLACE VIEW v_section_students AS
SELECT
    d.dept_code, c.course_code, c.course_name, sec.section_code, sec.section_id,
    t.full_name AS teacher_name, t.qualification AS teacher_qualification,
    sec.room_no, sec.enrolled_count,
    u.user_id, u.registration_no, u.full_name AS student_name, u.email AS student_email,
    ROUND(
        SUM(CASE WHEN ar.status='Present' THEN 1 ELSE 0 END) /
        NULLIF(COUNT(ar.record_id),0) * 100, 2) AS attendance_pct,
    CASE
        WHEN ROUND(SUM(CASE WHEN ar.status='Present' THEN 1 ELSE 0 END)/NULLIF(COUNT(ar.record_id),0)*100,2) < 75
        THEN 'Low' ELSE 'OK'
    END AS attendance_flag
FROM sections sec
JOIN course_semester cs ON cs.cs_id = sec.cs_id
JOIN courses c ON c.course_id = cs.course_id
JOIN departments d ON d.dept_id = c.dept_id
JOIN users t ON t.user_id = sec.teacher_id
JOIN student_enrollment se ON se.section_id = sec.section_id
JOIN users u ON u.user_id = se.student_id
LEFT JOIN attendance_records ar ON ar.student_id = u.user_id AND ar.section_id = sec.section_id
GROUP BY d.dept_code, c.course_code, c.course_name, sec.section_code, sec.section_id,
         t.full_name, t.qualification, sec.room_no, sec.enrolled_count,
         u.user_id, u.registration_no, u.full_name, u.email
ORDER BY d.dept_code, c.course_code, sec.section_code, u.registration_no;

CREATE OR REPLACE VIEW v_admin_dept_students AS
SELECT
    d.dept_code, d.dept_name, u.user_id, u.registration_no, u.full_name, u.email,
    c.course_code, c.course_name, sec.section_code,
    ROUND(
        SUM(CASE WHEN ar.status='Present' THEN 1 ELSE 0 END) /
        NULLIF(COUNT(ar.record_id),0) * 100, 2) AS course_attendance_pct,
    COUNT(ar.record_id) AS total_sessions,
    SUM(CASE WHEN ar.status='Present' THEN 1 ELSE 0 END) AS present_count,
    SUM(CASE WHEN ar.status='Absent'  THEN 1 ELSE 0 END) AS absent_count
FROM users u
JOIN departments d ON d.dept_id = u.dept_id
JOIN student_enrollment se ON se.student_id = u.user_id
JOIN sections sec ON sec.section_id = se.section_id
JOIN course_semester cs ON cs.cs_id = sec.cs_id
JOIN courses c ON c.course_id = cs.course_id
LEFT JOIN attendance_records ar ON ar.student_id = u.user_id AND ar.section_id = sec.section_id
WHERE u.role = 'Student'
GROUP BY d.dept_code, d.dept_name, u.user_id, u.registration_no,
         u.full_name, u.email, c.course_code, c.course_name, sec.section_code
ORDER BY d.dept_code, sec.section_code, u.registration_no, c.course_code;

-- =========================================================
-- VERIFICATION
-- =========================================================
SELECT '===== DATABASE SUMMARY =====' AS info;
SELECT
    (SELECT COUNT(*) FROM departments)                          AS departments,
    (SELECT COUNT(*) FROM courses)                              AS courses,
    (SELECT COUNT(*) FROM sections)                             AS sections,
    (SELECT COUNT(*) FROM users WHERE role='Teacher')           AS teachers,
    (SELECT COUNT(*) FROM users WHERE role='Student')           AS students,
    (SELECT COUNT(*) FROM attendance_sessions WHERE is_active=FALSE) AS past_sessions,
    (SELECT COUNT(*) FROM attendance_sessions WHERE is_active=TRUE)  AS active_sessions,
    (SELECT COUNT(*) FROM attendance_records)                   AS attendance_records,
    (SELECT COUNT(*) FROM fines)                                AS fines_issued,
    (SELECT COUNT(*) FROM fines WHERE status='Pending')         AS pending_fines,
    (SELECT COUNT(*) FROM fines WHERE status='Paid')            AS paid_fines;

SELECT '===== SECTION ENROLLMENT COUNT (should be ~15 per section) =====' AS info;
SELECT d.dept_code, c.course_code, sec.section_code, sec.enrolled_count
FROM sections sec
JOIN course_semester cs ON cs.cs_id=sec.cs_id
JOIN courses c ON c.course_id=cs.course_id
JOIN departments d ON d.dept_id=c.dept_id
ORDER BY d.dept_code, c.course_code, sec.section_code;

SELECT '===== LOW ATTENDANCE STUDENTS =====' AS info;
SELECT student_name, dept_code, course_code, section_code, attendance_pct, attendance_flag
FROM v_section_students
WHERE attendance_flag = 'Low'
ORDER BY attendance_pct ASC;

SELECT '===== FINES SUMMARY =====' AS info;
SELECT student_name, dept_code, course_code, attendance_percentage, fine_amount, status
FROM v_admin_fines
ORDER BY status, attendance_percentage;

SELECT 'complete_data.sql executed successfully!' AS final_status;