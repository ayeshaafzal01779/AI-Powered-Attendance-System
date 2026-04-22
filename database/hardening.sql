-- =========================================================
-- TriAttendanceDB Hardening (constraints + indexes)
-- =========================================================
USE TriAttendanceDB;

-- ---------- unique: student_enrollment(student_id, section_id)
SET @exists := (
    SELECT COUNT(*)
    FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = 'student_enrollment'
      AND index_name = 'uq_student_section'
);
SET @sql := IF(
    @exists = 0,
    'ALTER TABLE student_enrollment ADD CONSTRAINT uq_student_section UNIQUE (student_id, section_id)',
    'SELECT ''uq_student_section already exists'''
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ---------- unique: attendance_records(session_id, student_id)
SET @exists := (
    SELECT COUNT(*)
    FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = 'attendance_records'
      AND index_name = 'uq_session_student'
);
SET @sql := IF(
    @exists = 0,
    'ALTER TABLE attendance_records ADD CONSTRAINT uq_session_student UNIQUE (session_id, student_id)',
    'SELECT ''uq_session_student already exists'''
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ---------- performance indexes (MySQL-compatible, no IF NOT EXISTS)
SET @exists := (
    SELECT COUNT(*) FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = 'attendance_sessions'
      AND index_name = 'idx_sessions_teacher_active'
);
SET @sql := IF(
    @exists = 0,
    'CREATE INDEX idx_sessions_teacher_active ON attendance_sessions (teacher_id, is_active)',
    'SELECT ''idx_sessions_teacher_active already exists'''
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @exists := (
    SELECT COUNT(*) FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = 'attendance_sessions'
      AND index_name = 'idx_sessions_section_date_active'
);
SET @sql := IF(
    @exists = 0,
    'CREATE INDEX idx_sessions_section_date_active ON attendance_sessions (section_id, session_date, is_active)',
    'SELECT ''idx_sessions_section_date_active already exists'''
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @exists := (
    SELECT COUNT(*) FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = 'attendance_records'
      AND index_name = 'idx_records_student_session'
);
SET @sql := IF(
    @exists = 0,
    'CREATE INDEX idx_records_student_session ON attendance_records (student_id, session_id)',
    'SELECT ''idx_records_student_session already exists'''
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @exists := (
    SELECT COUNT(*) FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = 'attendance_records'
      AND index_name = 'idx_records_section_status'
);
SET @sql := IF(
    @exists = 0,
    'CREATE INDEX idx_records_section_status ON attendance_records (section_id, status)',
    'SELECT ''idx_records_section_status already exists'''
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @exists := (
    SELECT COUNT(*) FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = 'student_enrollment'
      AND index_name = 'idx_enrollment_section_student'
);
SET @sql := IF(
    @exists = 0,
    'CREATE INDEX idx_enrollment_section_student ON student_enrollment (section_id, student_id)',
    'SELECT ''idx_enrollment_section_student already exists'''
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @exists := (
    SELECT COUNT(*) FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = 'fines'
      AND index_name = 'idx_fines_student_status'
);
SET @sql := IF(
    @exists = 0,
    'CREATE INDEX idx_fines_student_status ON fines (student_id, status)',
    'SELECT ''idx_fines_student_status already exists'''
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT 'Hardening completed successfully' AS status;
