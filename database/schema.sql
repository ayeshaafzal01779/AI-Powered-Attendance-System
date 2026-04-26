-- =========================================================
-- TriAttendanceDB Schema 
-- =========================================================

CREATE DATABASE IF NOT EXISTS TriAttendanceDB;
USE TriAttendanceDB;

CREATE TABLE IF NOT EXISTS departments (
    dept_id INT AUTO_INCREMENT PRIMARY KEY,
    dept_code VARCHAR(20) NOT NULL UNIQUE,
    dept_name VARCHAR(100) NOT NULL,
    hod_name VARCHAR(100),
    contact_email VARCHAR(120)
);

CREATE TABLE IF NOT EXISTS programs (
    program_id INT AUTO_INCREMENT PRIMARY KEY,
    dept_id INT NOT NULL,
    program_code VARCHAR(30) NOT NULL UNIQUE,
    program_name VARCHAR(150) NOT NULL,
    duration INT DEFAULT 8,
    degree VARCHAR(20) DEFAULT 'BS',
    CONSTRAINT fk_program_dept FOREIGN KEY (dept_id) REFERENCES departments(dept_id)
);

CREATE TABLE IF NOT EXISTS semesters (
    sem_id INT AUTO_INCREMENT PRIMARY KEY,
    program_id INT NOT NULL,
    semester_number INT NOT NULL,
    semester_name VARCHAR(50) NOT NULL,
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_sem_program FOREIGN KEY (program_id) REFERENCES programs(program_id)
);

CREATE TABLE IF NOT EXISTS courses (
    course_id INT AUTO_INCREMENT PRIMARY KEY,
    dept_id INT NOT NULL,
    course_code VARCHAR(30) NOT NULL UNIQUE,
    course_name VARCHAR(120) NOT NULL,
    credit_hours INT DEFAULT 3,
    course_type VARCHAR(20) DEFAULT 'Theory',
    CONSTRAINT fk_course_dept FOREIGN KEY (dept_id) REFERENCES departments(dept_id)
);

CREATE TABLE IF NOT EXISTS course_semester (
    cs_id INT AUTO_INCREMENT PRIMARY KEY,
    course_id INT NOT NULL,
    sem_id INT NOT NULL,
    is_compulsory BOOLEAN DEFAULT TRUE,
    CONSTRAINT fk_cs_course FOREIGN KEY (course_id) REFERENCES courses(course_id),
    CONSTRAINT fk_cs_sem FOREIGN KEY (sem_id) REFERENCES semesters(sem_id)
);

CREATE TABLE IF NOT EXISTS users (
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

CREATE TABLE IF NOT EXISTS sections (
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

CREATE TABLE IF NOT EXISTS student_enrollment (
    enrollment_id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    section_id INT NOT NULL,
    enrolled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_enroll_student FOREIGN KEY (student_id) REFERENCES users(user_id),
    CONSTRAINT fk_enroll_section FOREIGN KEY (section_id) REFERENCES sections(section_id)
);

CREATE TABLE IF NOT EXISTS attendance_sessions (
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

CREATE TABLE IF NOT EXISTS attendance_records (
    record_id INT AUTO_INCREMENT PRIMARY KEY,
    session_id INT NULL,
    student_id INT NOT NULL,
    section_id INT NOT NULL,
    attendance_date DATE NOT NULL DEFAULT (CURRENT_DATE),
    mode VARCHAR(20) DEFAULT 'QR',
    status VARCHAR(20) DEFAULT 'Present',
    sync_status VARCHAR(20) DEFAULT 'Synced',
    marked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_record_session FOREIGN KEY (session_id) REFERENCES attendance_sessions(session_id),
    CONSTRAINT fk_record_student FOREIGN KEY (student_id) REFERENCES users(user_id),
    CONSTRAINT fk_record_section FOREIGN KEY (section_id) REFERENCES sections(section_id),
    CONSTRAINT uq_attendance_session_student UNIQUE (session_id, student_id)
);

CREATE TABLE IF NOT EXISTS fines (
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

-- Optional placeholder for existing script compatibility
CREATE TABLE IF NOT EXISTS facial_data (
    face_id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    embedding LONGTEXT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_face_student FOREIGN KEY (student_id) REFERENCES users(user_id)
);
