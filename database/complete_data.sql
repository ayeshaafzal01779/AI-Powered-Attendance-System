-- =========================================================
-- TriAttendanceDB — COMPREHENSIVE DATA POPULATION (FIXED)
-- =========================================================
USE TriAttendanceDB;

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_SAFE_UPDATES = 0;

-- =========================================================
-- 0. HELPER TABLES FOR REALISTIC NAMES
-- =========================================================
DROP TABLE IF EXISTS temp_names;
CREATE TABLE temp_names (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(100));
INSERT INTO temp_names (name) VALUES 
('Zubair Ahmed'), ('Sana Malik'), ('Hamza Siddiqui'), ('Fatima Sheikh'), ('Bilal Mansoor'),
('Ayesha Farooq'), ('Usman Ghani'), ('Maryam Iqbal'), ('Omar Hashmi'), ('Zainab Javeed'),
('Mustafa Kamal'), ('Hafsa Noor'), ('Ibrahim Khalil'), ('Khadija Batool'), ('Yahya Khan'),
('Sara Qureshi'), ('Haris Rauf'), ('Amna Basit'), ('Saad Bin Zafar'), ('Mahnoor Baloch'),
('Faisal Mehmood'), ('Hina Altaf'), ('Arsalan Shah'), ('Rida Fatima'), ('Zohaib Hassan'),
('Nida Dar'), ('Babar Azam'), ('Eshal Fayyaz'), ('Shaheen Afridi'), ('Momina Zahid'),
('Arham Khan'), ('Zunaira Malik'), ('Taha Siddiqui'), ('Laiba Jameel'), ('Daniyal Ahmed'),
('Wajiha Shah'), ('Farhan Ali'), ('Maham Rizvi'), ('Zayan Malik'), ('Aqsa Batool'),
('Umar Akmal'), ('Sana Aly'), ('Kamran Khan'), ('Ramsha Khan'), ('Asad Raza'),
('Yumna Jamil'), ('Wahid Ali'), ('Maira Ali'), ('Bilal Abbas'), ('Iqra Aziz'),
('Yasir Hussain'), ('Kubra Khan'), ('Gohar Rasheed'), ('Sanam Baloch'), ('Fawad Ali'),
('Mahira Shah'), ('Atif Ahmed'), ('Rahat Ali'), ('Abida Bibi'), ('Naseebo Begum'),
('Saba Parveen'), ('Zahid Mehmood'), ('Muneeb Khan'), ('Aiman Malik'), ('Minal Malik'),
('Ahsan Khan'), ('Neelam Bibi'), ('Imran Ashraf'), ('Urwa Malik'), ('Mawra Malik'),
('Asim Azhar'), ('Sheheryar Shah'), ('Syra Yousuf'), ('Shahroz Khan'), ('Sadaf Kanwal'),
('Amina Sheikh'), ('Mohsin Mirza'), ('Sanam Jameel'), ('Sarwat Gilani'), ('Fahad Mirza'),
('Mehwish Shah'), ('Humayun Ali'), ('Adnan Siddiqui'), ('Shahid Khan'), ('Reema Bibi'),
('Rashid Khan'), ('Meera Jan'), ('Saud Ahmed'), ('Javeria Khan'), ('Saima Rambo'),
('Faisal Qureshi'), ('Aijaz Khan'), ('Sami Ahmed'), ('Junaid Ali'), ('Zahid Sultan'),
('Mikaal Ahmed'), ('Osman Khalid'), ('Ahmed Ali'), ('Ali Rehman'), ('Gohar Khan');

TRUNCATE TABLE chatbot_messages;
TRUNCATE TABLE chatbot_sessions;
TRUNCATE TABLE fines;
TRUNCATE TABLE attendance_records;
TRUNCATE TABLE attendance_sessions;
TRUNCATE TABLE student_enrollment;
TRUNCATE TABLE sections;
TRUNCATE TABLE course_semester;
TRUNCATE TABLE facial_data;
TRUNCATE TABLE users;
TRUNCATE TABLE courses;
TRUNCATE TABLE semesters;
TRUNCATE TABLE programs;
TRUNCATE TABLE departments;
TRUNCATE TABLE role_permissions;
TRUNCATE TABLE permissions;

-- =========================================================
-- 1. DEPARTMENTS
-- =========================================================
INSERT INTO departments (dept_code, dept_name, hod_name, contact_email) VALUES
('CS', 'Computer Science',        'Dr. Ahmed Raza',   'cs@tria.edu'),
('IT', 'Information Technology',  'Dr. Ali Haider',   'it@tria.edu'),
('SE', 'Software Engineering',    'Dr. Umar Farooq',  'se@tria.edu'),
('AI', 'Artificial Intelligence', 'Dr. Hina Naeem',   'ai@tria.edu');

-- =========================================================
-- 2. PROGRAMS
-- =========================================================
INSERT INTO programs (dept_id, program_code, program_name, duration, degree)
SELECT dept_id, CONCAT('BS-', dept_code), CONCAT('Bachelor of Science in ', dept_name), 8, 'BS'
FROM departments;

-- =========================================================
-- 3. SEMESTERS (2, 4, 6, 8)
-- =========================================================
INSERT INTO semesters (program_id, semester_number, semester_name, start_date, end_date, is_active)
SELECT program_id, n, CONCAT('Semester ', n), '2026-02-01', '2026-06-30', TRUE
FROM programs CROSS JOIN (SELECT 2 AS n UNION SELECT 4 UNION SELECT 6 UNION SELECT 8) AS nums;

-- =========================================================
-- 4. COURSES (5 per semester per department = 80 total)
-- =========================================================
INSERT INTO courses (dept_id, course_code, course_name, credit_hours, course_type)
SELECT 
    d.dept_id, 
    CONCAT(d.dept_code, s.semester_number, '0', nums.n), 
    CONCAT(d.dept_name, ' Course ', s.semester_number, '-', nums.n),
    3, 'Theory'
FROM departments d
JOIN programs p ON p.dept_id = d.dept_id
JOIN semesters s ON s.program_id = p.program_id
CROSS JOIN (SELECT 1 AS n UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5) AS nums;

-- =========================================================
-- 5. COURSE-SEMESTER MAPPING
-- =========================================================
INSERT INTO course_semester (course_id, sem_id)
SELECT c.course_id, s.sem_id
FROM courses c
JOIN departments d ON c.dept_id = d.dept_id
JOIN programs p ON p.dept_id = d.dept_id
JOIN semesters s ON s.program_id = p.program_id
WHERE SUBSTRING(c.course_code, LENGTH(d.dept_code)+1, 1) = CAST(s.semester_number AS CHAR);

-- =========================================================
-- 6. USERS - ADMIN
-- =========================================================
INSERT INTO users (email, password, role, full_name, phone)
VALUES ('aqsahashmi483@gmail.com', '$2b$12$eQur4nCSdUD.MwQKMLm4qeETULDHykrjRh4qRqzM/u0Fp.d4Y/jrO', 'Admin', 'Aqsa Hashmi', '03004830000');

-- =========================================================
-- 7. USERS - TEACHERS (10 per department = 40 total)
-- =========================================================
INSERT INTO users (email, password, role, full_name, phone, dept_id, employee_id, qualification)
SELECT 
    LOWER(CONCAT(REPLACE((SELECT name FROM temp_names WHERE id = (d.dept_id * 10 + nums.n)), ' ', ''), '@tria.edu')),
    '$2b$12$IMdGr2vhxHagNVFoj.A/Z.13JoOf04EYVEzgGrv3DtuW7RhOhHcXi',
    'Teacher',
    (SELECT name FROM temp_names WHERE id = (d.dept_id * 10 + nums.n)),
    CONCAT('0301', d.dept_id, '00', nums.n),
    d.dept_id,
    CONCAT('TCH-', d.dept_code, '-', LPAD(nums.n, 2, '0')),
    'PhD'
FROM departments d
CROSS JOIN (SELECT 1 AS n UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10) AS nums;

-- Update specific teachers
UPDATE users SET email = 'ayesha.malik@tria.edu', full_name = 'Prof. Ayesha Malik' WHERE employee_id = 'TCH-IT-01';
UPDATE users SET email = 'aqsa.hashmi@tria.edu', full_name = 'Prof. Aqsa Hashmi' WHERE employee_id = 'TCH-CS-01';
UPDATE users SET email = 'malik.afzal@tria.edu', full_name = 'Prof. Malik Afzal' WHERE employee_id = 'TCH-AI-01';

-- =========================================================
-- 8. SECTIONS
-- =========================================================
-- Assign each of the 10 teachers per dept to 2 courses (20 courses per dept total)
-- We use the teacher's employee_id suffix (01-10) to match the course number (1-20)
INSERT INTO sections (cs_id, section_code, teacher_id, room_no, capacity)
SELECT 
    cs.cs_id,
    'A',
    u.user_id,
    CONCAT('Room-', cs.cs_id),
    30
FROM course_semester cs
JOIN courses c ON cs.course_id = c.course_id
JOIN departments d ON c.dept_id = d.dept_id
JOIN users u ON u.dept_id = d.dept_id AND u.role = 'Teacher'
WHERE CAST(RIGHT(u.employee_id, 2) AS UNSIGNED) = 
      MOD((CAST(SUBSTRING(c.course_code, LENGTH(d.dept_code)+1) AS UNSIGNED) - 1), 10) + 1;


-- =========================================================
-- 9. USERS - STUDENTS (20 per semester = 320 total)
-- =========================================================
INSERT INTO users (email, password, role, full_name, phone, dept_id, registration_no, program_id, current_sem_id)
SELECT 
    LOWER(CONCAT(
        REPLACE((SELECT name FROM temp_names WHERE id = ((d.dept_id * 20 + s.semester_number * 5 + nums.n) % 100) + 1), ' ', '.'),
        '.', LPAD(nums.n + (s.semester_number * 20), 3, '0'),
        '@tria.edu'
    )),
    '$2b$12$STtHVc6e7M4.T/OsHZZ3qu.cEF7bbkp0Y/Wq7qkItRrQtRqprHSXy',
    'Student',
    (SELECT name FROM temp_names WHERE id = ((d.dept_id * 20 + s.semester_number * 5 + nums.n) % 100) + 1),
    CONCAT('0321', d.dept_id, s.semester_number, LPAD(nums.n, 2, '0')),
    d.dept_id,
    CONCAT(d.dept_code, '-2024-', LPAD(nums.n + (s.semester_number * 20), 3, '0')),
    p.program_id,
    s.sem_id
FROM departments d
JOIN programs p ON p.dept_id = d.dept_id
JOIN semesters s ON s.program_id = p.program_id
CROSS JOIN (
    SELECT 1 AS n UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 
    UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10 
    UNION SELECT 11 UNION SELECT 12 UNION SELECT 13 UNION SELECT 14 UNION SELECT 15 
    UNION SELECT 16 UNION SELECT 17 UNION SELECT 18 UNION SELECT 19 UNION SELECT 20
) AS nums;

-- Update specific students
UPDATE users SET email = 'meerab.gohar@tria.edu', full_name = 'Meerab Gohar' WHERE registration_no LIKE 'IT-2024-161';
UPDATE users SET email = 'aqsa.noor@tria.edu', full_name = 'Aqsa Noor' WHERE registration_no LIKE 'CS-2024-041';
UPDATE users SET email = 'ahmar.hashmi@tria.edu', full_name = 'Ahmar Hashmi' WHERE registration_no LIKE 'IT-2024-041';
UPDATE users SET email = 'meerab.04@tria.edu', full_name = 'Meerab 04' WHERE registration_no LIKE 'AI-2024-041';
UPDATE users SET email = 'arham.gohar@tria.edu', full_name = 'Arham Gohar' WHERE registration_no LIKE 'CS-2024-081';
UPDATE users SET email = 'inshal.malik@tria.edu', full_name = 'Inshal Malik' WHERE registration_no LIKE 'SE-2024-121';

-- =========================================================
-- 10. STUDENT ENROLLMENT
-- =========================================================
INSERT INTO student_enrollment (student_id, section_id)
SELECT u.user_id, sec.section_id
FROM users u
JOIN semesters s ON u.current_sem_id = s.sem_id
JOIN course_semester cs ON cs.sem_id = s.sem_id
JOIN sections sec ON sec.cs_id = cs.cs_id
WHERE u.role = 'Student';

-- =========================================================
-- 11. ATTENDANCE SESSIONS (Past 10 days)
-- =========================================================
INSERT INTO attendance_sessions (section_id, teacher_id, session_date, start_time, is_active)
SELECT 
    sec.section_id,
    sec.teacher_id,
    DATE_SUB('2026-04-27', INTERVAL nums.n DAY),
    CONCAT(DATE_SUB('2026-04-27', INTERVAL nums.n DAY), ' 09:00:00'),
    FALSE -- Completed sessions
FROM sections sec
CROSS JOIN (SELECT 1 AS n UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10) AS nums;

-- =========================================================
-- 12. ATTENDANCE RECORDS (Status must be 'Present' or 'Absent')
-- =========================================================
INSERT INTO attendance_records (session_id, student_id, section_id, attendance_date, status, mode, marked_at)
SELECT 
    asess.session_id,
    se.student_id,
    se.section_id,
    asess.session_date,
    CASE 
        -- High attendance students (Roll numbers 1-10)
        WHEN CAST(SUBSTRING_INDEX(u.registration_no, '-', -1) AS UNSIGNED) % 20 <= 10 THEN 'Present'
        -- Moderate attendance (Roll 11-15)
        WHEN CAST(SUBSTRING_INDEX(u.registration_no, '-', -1) AS UNSIGNED) % 20 <= 15 THEN 
            IF(DATEDIFF('2026-04-27', asess.session_date) <= 8, 'Present', 'Absent')
        -- Low attendance (Roll 16-20) - many will be < 75%
        ELSE 
            IF(DATEDIFF('2026-04-27', asess.session_date) <= 5, 'Present', 'Absent')
    END,
    'QR',
    CONCAT(asess.session_date, ' 09:', LPAD(FLOOR(RAND() * 50), 2, '0'), ':', LPAD(FLOOR(RAND() * 59), 2, '0'))
FROM student_enrollment se
JOIN users u ON se.student_id = u.user_id
JOIN attendance_sessions asess ON se.section_id = asess.section_id;

-- =========================================================
-- 13. FINES (Mix of Pending, Paid, and No-fine for Low Attendance)
-- =========================================================
INSERT INTO fines (student_id, course_code, course_name, attendance_percentage, fine_amount, status)
SELECT 
    u.user_id,
    c.course_code,
    c.course_name,
    60.00,
    500.00,
    CASE 
        WHEN CAST(SUBSTRING_INDEX(u.registration_no, '-', -1) AS UNSIGNED) % 20 = 16 THEN 'Pending'
        WHEN CAST(SUBSTRING_INDEX(u.registration_no, '-', -1) AS UNSIGNED) % 20 = 17 THEN 'Pending'
        WHEN CAST(SUBSTRING_INDEX(u.registration_no, '-', -1) AS UNSIGNED) % 20 = 18 THEN 'Paid'
        WHEN CAST(SUBSTRING_INDEX(u.registration_no, '-', -1) AS UNSIGNED) % 20 = 19 THEN 'Paid'
        ELSE 'Pending' -- Fallback, but the WHERE clause will filter
    END
FROM users u
JOIN student_enrollment se ON u.user_id = se.student_id
JOIN sections sec ON se.section_id = sec.section_id
JOIN course_semester cs ON sec.cs_id = cs.cs_id
JOIN courses c ON cs.course_id = c.course_id
WHERE u.role = 'Student'
  AND CAST(SUBSTRING_INDEX(u.registration_no, '-', -1) AS UNSIGNED) % 20 IN (16, 17, 18, 19);
  -- Roll 20 will have low attendance but NO fine (Admin can issue it)

-- =========================================================
-- 14. PERMISSIONS & RBAC
-- =========================================================
INSERT INTO permissions (permission_name, description) VALUES
('view_attendance', 'Can view attendance records'),
('mark_attendance', 'Can mark attendance for students'),
('manage_users', 'Can manage all system users'),
('view_reports', 'Can view analytical reports'),
('manage_fines', 'Can manage student fines');

INSERT INTO role_permissions (role, permission_id)
SELECT 'Admin', permission_id FROM permissions;

INSERT INTO role_permissions (role, permission_id)
SELECT 'Teacher', permission_id FROM permissions WHERE permission_name IN ('view_attendance', 'mark_attendance', 'view_reports');

INSERT INTO role_permissions (role, permission_id)
SELECT 'Student', permission_id FROM permissions WHERE permission_name IN ('view_attendance');

-- =========================================================
-- 15. FINAL UPDATES
-- =========================================================
UPDATE sections s
SET enrolled_count = (SELECT COUNT(*) FROM student_enrollment se WHERE se.section_id = s.section_id);

SET SQL_SAFE_UPDATES = 1;
SET FOREIGN_KEY_CHECKS = 1;
DROP TABLE IF EXISTS temp_names;

SELECT 'Comprehensive data population completed successfully' AS status;
