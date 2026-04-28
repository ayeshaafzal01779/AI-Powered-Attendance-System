-- =========================================================
-- TriAttendanceDB Schema (Clean & Optimized)
-- =========================================================

DROP DATABASE IF EXISTS TriAttendanceDB;
CREATE DATABASE TriAttendanceDB;
USE TriAttendanceDB;

-- 1. DEPARTMENTS
CREATE TABLE departments (
    dept_id INT AUTO_INCREMENT PRIMARY KEY,
    dept_code VARCHAR(20) NOT NULL UNIQUE,
    dept_name VARCHAR(100) NOT NULL,
    hod_name VARCHAR(100),
    contact_email VARCHAR(120)
);

-- 2. PROGRAMS
CREATE TABLE programs (
    program_id INT AUTO_INCREMENT PRIMARY KEY,
    dept_id INT NOT NULL,
    program_code VARCHAR(30) NOT NULL UNIQUE,
    program_name VARCHAR(150) NOT NULL,
    duration INT DEFAULT 8,
    degree VARCHAR(20) DEFAULT 'BS',
    CONSTRAINT fk_program_dept FOREIGN KEY (dept_id) REFERENCES departments(dept_id)
);

-- 3. SEMESTERS
CREATE TABLE semesters (
    sem_id INT AUTO_INCREMENT PRIMARY KEY,
    program_id INT NOT NULL,
    semester_number INT NOT NULL,
    semester_name VARCHAR(50) NOT NULL,
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_sem_program FOREIGN KEY (program_id) REFERENCES programs(program_id)
);

-- 4. COURSES
CREATE TABLE courses (
    course_id INT AUTO_INCREMENT PRIMARY KEY,
    dept_id INT NOT NULL,
    course_code VARCHAR(30) NOT NULL UNIQUE,
    course_name VARCHAR(120) NOT NULL,
    credit_hours INT DEFAULT 3,
    course_type VARCHAR(20) DEFAULT 'Theory',
    CONSTRAINT fk_course_dept FOREIGN KEY (dept_id) REFERENCES departments(dept_id)
);

-- 5. COURSE-SEMESTER MAPPING
CREATE TABLE course_semester (
    cs_id INT AUTO_INCREMENT PRIMARY KEY,
    course_id INT NOT NULL,
    sem_id INT NOT NULL,
    is_compulsory BOOLEAN DEFAULT TRUE,
    CONSTRAINT fk_cs_course FOREIGN KEY (course_id) REFERENCES courses(course_id),
    CONSTRAINT fk_cs_sem FOREIGN KEY (sem_id) REFERENCES semesters(sem_id)
);

-- 6. USERS (Admin, Teacher, Student)
CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(120) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('Admin', 'Teacher', 'Student') NOT NULL,
    full_name VARCHAR(120) NOT NULL,
    phone VARCHAR(20),
    dept_id INT NULL,
    employee_id VARCHAR(50) NULL UNIQUE,
    qualification VARCHAR(100),
    registration_no VARCHAR(50) NULL UNIQUE,
    program_id INT NULL,
    current_sem_id INT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user_dept FOREIGN KEY (dept_id) REFERENCES departments(dept_id),
    CONSTRAINT fk_user_program FOREIGN KEY (program_id) REFERENCES programs(program_id),
    CONSTRAINT fk_user_sem FOREIGN KEY (current_sem_id) REFERENCES semesters(sem_id)
);

-- 7. SECTIONS
CREATE TABLE sections (
    section_id INT AUTO_INCREMENT PRIMARY KEY,
    cs_id INT NOT NULL,
    section_code VARCHAR(10) NOT NULL,
    teacher_id INT NOT NULL,
    room_no VARCHAR(50),
    capacity INT DEFAULT 0,
    enrolled_count INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    CONSTRAINT fk_section_cs FOREIGN KEY (cs_id) REFERENCES course_semester(cs_id),
    CONSTRAINT fk_section_teacher FOREIGN KEY (teacher_id) REFERENCES users(user_id)
);

-- 8. STUDENT ENROLLMENT
CREATE TABLE student_enrollment (
    enrollment_id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    section_id INT NOT NULL,
    enrolled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_enroll_student FOREIGN KEY (student_id) REFERENCES users(user_id),
    CONSTRAINT fk_enroll_section FOREIGN KEY (section_id) REFERENCES sections(section_id),
    CONSTRAINT uq_student_section UNIQUE (student_id, section_id)
);

-- 9. ATTENDANCE SESSIONS
CREATE TABLE attendance_sessions (
    session_id INT AUTO_INCREMENT PRIMARY KEY,
    section_id INT NOT NULL,
    teacher_id INT NOT NULL,
    session_date DATE NOT NULL,
    start_time DATETIME,
    end_time DATETIME NULL,
    session_token VARCHAR(100),
    mode VARCHAR(20) DEFAULT 'Hybrid',
    qr_code LONGTEXT NULL,
    qr_generated_at DATETIME NULL,
    is_active BOOLEAN DEFAULT TRUE,
    CONSTRAINT fk_session_section FOREIGN KEY (section_id) REFERENCES sections(section_id),
    CONSTRAINT fk_session_teacher FOREIGN KEY (teacher_id) REFERENCES users(user_id)
);

-- 10. ATTENDANCE RECORDS
CREATE TABLE attendance_records (
    record_id INT AUTO_INCREMENT PRIMARY KEY,
    session_id INT NULL,
    student_id INT NOT NULL,
    section_id INT NOT NULL,
    attendance_date DATE NULL,
    mode VARCHAR(20) DEFAULT 'QR',
    status VARCHAR(20) DEFAULT 'Present',
    sync_status VARCHAR(20) DEFAULT 'Synced',
    marked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    modified_by INT NULL,
    modification_reason VARCHAR(255) NULL,
    CONSTRAINT fk_record_session FOREIGN KEY (session_id) REFERENCES attendance_sessions(session_id),
    CONSTRAINT fk_record_student FOREIGN KEY (student_id) REFERENCES users(user_id),
    CONSTRAINT fk_record_section FOREIGN KEY (section_id) REFERENCES sections(section_id),
    CONSTRAINT uq_attendance_session_student UNIQUE (session_id, student_id)
);

-- 11. ATTENDANCE AUDIT TRAIL
CREATE TABLE attendance_audit (
    audit_id INT AUTO_INCREMENT PRIMARY KEY,
    record_id INT NOT NULL,
    old_status VARCHAR(20),
    new_status VARCHAR(20),
    modified_by INT,
    modified_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    reason VARCHAR(255),
    CONSTRAINT fk_audit_record FOREIGN KEY (record_id) REFERENCES attendance_records(record_id),
    CONSTRAINT fk_audit_user FOREIGN KEY (modified_by) REFERENCES users(user_id)
);

-- 12. PERMISSIONS & RBAC
CREATE TABLE permissions (
    permission_id INT AUTO_INCREMENT PRIMARY KEY,
    permission_name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT
);

CREATE TABLE role_permissions (
    role ENUM('Admin', 'Teacher', 'Student') NOT NULL,
    permission_id INT NOT NULL,
    PRIMARY KEY (role, permission_id),
    CONSTRAINT fk_rp_permission FOREIGN KEY (permission_id) REFERENCES permissions(permission_id)
);

-- 13. FINES
CREATE TABLE fines (
    fine_id INT PRIMARY KEY AUTO_INCREMENT,
    student_id INT NOT NULL,
    course_code VARCHAR(20),
    course_name VARCHAR(100),
    attendance_percentage DECIMAL(5,2),
    fine_amount DECIMAL(10,2) DEFAULT 500.00,
    status VARCHAR(20) DEFAULT 'Pending',
    issued_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    paid_date DATETIME NULL,
    CONSTRAINT fk_fines_student FOREIGN KEY (student_id) REFERENCES users(user_id)
);

-- 14. FACIAL DATA (Optional)
CREATE TABLE facial_data (
    face_id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    embedding LONGTEXT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_face_student FOREIGN KEY (student_id) REFERENCES users(user_id)
);

-- 15. CHATBOT TABLES
CREATE TABLE chatbot_sessions (
    session_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    CONSTRAINT fk_chatbot_user FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE TABLE chatbot_messages (
    message_id INT AUTO_INCREMENT PRIMARY KEY,
    session_id INT NOT NULL,
    sender_role ENUM('User', 'AI') NOT NULL,
    message_text TEXT NOT NULL,
    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_chatbot_session FOREIGN KEY (session_id) REFERENCES chatbot_sessions(session_id)
);

-- =========================================================
-- INDEXES FOR PERFORMANCE
-- =========================================================
CREATE INDEX idx_sessions_teacher_active ON attendance_sessions (teacher_id, is_active);
CREATE INDEX idx_sessions_section_date_active ON attendance_sessions (section_id, session_date, is_active);
CREATE INDEX idx_records_student_session ON attendance_records (student_id, session_id);
CREATE INDEX idx_records_section_status ON attendance_records (section_id, status);
CREATE INDEX idx_enrollment_section_student ON student_enrollment (section_id, student_id);
CREATE INDEX idx_fines_student_status ON fines (student_id, status);

-- =========================================================
-- TRIGGERS
-- =========================================================
DELIMITER //
CREATE TRIGGER trg_attendance_audit
AFTER UPDATE ON attendance_records
FOR EACH ROW
BEGIN
    IF OLD.status <> NEW.status THEN
        INSERT INTO attendance_audit (record_id, old_status, new_status, modified_by, reason)
        VALUES (OLD.record_id, OLD.status, NEW.status, NEW.modified_by, NEW.modification_reason);
    END IF;
END //
DELIMITER ;
