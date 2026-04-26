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


INSERT INTO users (email, password, role, full_name, phone) VALUES
('admin@tria.com', '$2b$12$eQur4nCSdUD.MwQKMLm4qeETULDHykrjRh4qRqzM/u0Fp.d4Y/jrO', 'Admin', 'System Administrator', '03000000000');

