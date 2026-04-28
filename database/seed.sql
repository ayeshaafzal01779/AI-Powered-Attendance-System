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
TRUNCATE TABLE chatbot_sessions;
TRUNCATE TABLE chatbot_messages;
SET FOREIGN_KEY_CHECKS = 1;

-- Seed data is now managed via complete_data.sql for consistency.
-- You can run complete_data.sql to populate the entire database with the semester system requirements.
-- This file remains for quick truncation if needed.
