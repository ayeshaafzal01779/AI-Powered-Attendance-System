from flask import Flask, request, jsonify, render_template, session
from flask_cors import CORS
from datetime import datetime, date
import qrcode
import io
import base64
import uuid
import os
from functools import wraps
from database import get_db_connection

# Flask app setup
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
app = Flask(__name__, 
            template_folder=os.path.join(BASE_DIR, 'frontend', 'templates'),
            static_folder=os.path.join(BASE_DIR, 'frontend', 'static'),
            static_url_path='/static')

# CORS setup - Allow credentials
CORS(app, supports_credentials=True, origins=['http://127.0.0.1:5000', 'http://localhost:5000'])

# Required for session
app.secret_key = "your_secret_key_123"

# ============================================
# ROLE PROTECTION DECORATORS
# ============================================

def role_required(allowed_roles):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Check login session
            if 'user_id' not in session:
                return jsonify({"status": "error", "message": "Login required"}), 401
            # Check role
            if session.get('role') not in allowed_roles:
                return jsonify({"status": "error", "message": "Access denied"}), 403
            return f(*args, **kwargs)
        return decorated_function
    return decorator

# ============================================
# SERVE HTML PAGES WITH ROLE CHECK
# ============================================

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/admin_dashboard')
@role_required(['Admin'])
def admin_dashboard():
    return render_template('admin_dashboard.html')

@app.route('/teacher_dashboard')
@role_required(['Teacher'])
def teacher_dashboard():
    return render_template('teacher_dashboard.html')

@app.route('/student_dashboard')
@role_required(['Student'])
def student_dashboard():
    return render_template('student_dashboard.html')

# ============================================
# GET CURRENT USER
# ============================================

@app.route('/current_user', methods=['GET'])
@role_required(['Admin', 'Teacher', 'Student'])
def current_user():
    user_id = session.get('user_id')
    
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute(
        "SELECT user_id, full_name, email, role FROM users WHERE user_id = %s",
        (user_id,)
    )
    user = cursor.fetchone()
    cursor.close()
    conn.close()
    
    if not user:
        return jsonify({"status": "error", "message": "User not found"}), 404
    
    return jsonify({
        "status": "success",
        "user": {
            "id": user['user_id'],
            "name": user['full_name'],
            "email": user['email'],
            "role": user['role']
        }
    })

# ============================================
# LOGIN API
# ============================================

@app.route('/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    
    if not email or not password:
        return jsonify({"status": "error", "message": "Email and password required"}), 400

    conn = get_db_connection()
    if conn is None:
        return jsonify({"status": "error", "message": "Database connection failed"}), 500

    cursor = conn.cursor(dictionary=True)
    cursor.execute(
        "SELECT user_id, full_name, email, role FROM users WHERE email = %s AND password = %s",
        (email, password)
    )
    user = cursor.fetchone()
    cursor.close()
    conn.close()
    
    if not user:
        return jsonify({"status": "error", "message": "Invalid email or password"}), 401
    
    # Store session
    session['user_id'] = user['user_id']
    session['role'] = user['role']
    
    return jsonify({
        "status": "success",
        "user": {
            "id": user['user_id'],
            "name": user['full_name'],
            "email": user['email'],
            "role": user['role']
        }
    })

# ============================================
# GET LOW ATTENDANCE STUDENTS (ADMIN)
# ============================================
@app.route('/admin_low_attendance', methods=['GET'])
@role_required(['Admin'])
def get_low_attendance():
    conn = get_db_connection()
    if conn is None:
        return jsonify({"status": "error", "message": "DB connection failed"}), 500
    
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
        SELECT 
            u.user_id,
            u.full_name,
            u.email,
            c.course_code,
            c.course_name,
            COUNT(DISTINCT CASE WHEN ar.status = 'Present' THEN ar.record_id END) as present_days,
            COUNT(DISTINCT ar.record_id) as total_sessions,
            ROUND(
                COUNT(DISTINCT CASE WHEN ar.status = 'Present' THEN ar.record_id END) * 100.0 /
                NULLIF(COUNT(DISTINCT ar.record_id), 0), 2
            ) as percentage
        FROM attendance_records ar
        JOIN users u ON ar.student_id = u.user_id
        JOIN sections sec ON ar.section_id = sec.section_id
        JOIN course_semester cs ON sec.cs_id = cs.cs_id
        JOIN courses c ON cs.course_id = c.course_id
        WHERE u.role = 'Student'
        GROUP BY u.user_id, u.full_name, u.email, c.course_code, c.course_name
        HAVING percentage < 75
        ORDER BY percentage ASC
    """)
    students = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify({"status": "success", "students": students})


# ============================================
# ISSUE FINE (ADMIN)
# ============================================
@app.route('/admin_issue_fine', methods=['POST'])
@role_required(['Admin'])
def issue_fine():
    data = request.get_json()
    student_id = data.get('student_id')
    course_code = data.get('course_code')
    course_name = data.get('course_name')
    percentage = data.get('percentage')
    
    conn = get_db_connection()
    if conn is None:
        return jsonify({"status": "error", "message": "DB connection failed"}), 500
    
    cursor = conn.cursor(dictionary=True)
    
    # Check if fine already issued
    cursor.execute("""
        SELECT fine_id FROM fines 
        WHERE student_id = %s AND course_code = %s AND status = 'Pending'
    """, (student_id, course_code))
    existing = cursor.fetchone()
    
    if existing:
        cursor.close()
        conn.close()
        return jsonify({"status": "error", "message": "Fine already issued for this course"}), 400
    
    # Insert fine
    cursor.execute("""
        INSERT INTO fines (student_id, course_code, course_name, attendance_percentage, fine_amount, status)
        VALUES (%s, %s, %s, %s, 500.00, 'Pending')
    """, (student_id, course_code, course_name, percentage))
    conn.commit()
    
    cursor.close()
    conn.close()
    return jsonify({"status": "success", "message": "Fine issued successfully"})


# ============================================
# GET MY FINES (STUDENT)
# ============================================
@app.route('/my_fines', methods=['GET'])
@role_required(['Student'])
def get_my_fines():
    conn = get_db_connection()
    if conn is None:
        return jsonify({"status": "error", "message": "DB connection failed"}), 500
    
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
        SELECT fine_id, course_code, course_name, 
               attendance_percentage, fine_amount, 
               status, issued_date
        FROM fines
        WHERE student_id = %s
        ORDER BY issued_date DESC
    """, (session['user_id'],))
    fines = cursor.fetchall()
    
    for fine in fines:
        if fine['issued_date']:
            fine['issued_date'] = fine['issued_date'].strftime('%Y-%m-%d')
    
    cursor.close()
    conn.close()
    return jsonify({"status": "success", "fines": fines})


# ============================================
# PAY FINE (STUDENT)
# ============================================
@app.route('/pay_fine', methods=['POST'])
@role_required(['Student'])
def pay_fine():
    data = request.get_json()
    fine_id = data.get('fine_id')
    
    conn = get_db_connection()
    if conn is None:
        return jsonify({"status": "error", "message": "DB connection failed"}), 500
    
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE fines 
        SET status = 'Paid', paid_date = NOW()
        WHERE fine_id = %s AND student_id = %s
    """, (fine_id, session['user_id']))
    conn.commit()
    
    cursor.close()
    conn.close()
    return jsonify({"status": "success", "message": "Fine paid successfully"})

# ============================================
# LOGOUT
# ============================================

@app.route('/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({"status": "success", "message": "Logged out successfully"})

# ============================================
# ADMIN APIs
# ============================================

@app.route('/admin_stats', methods=['GET'])
@role_required(['Admin'])
def admin_stats():
    conn = get_db_connection()
    if conn is None:
        return jsonify({"status": "error", "message": "DB connection failed"}), 500
    
    cursor = conn.cursor(dictionary=True)
    
    cursor.execute("SELECT COUNT(*) as total FROM users WHERE role = 'Student'")
    students = cursor.fetchone()
    
    cursor.execute("SELECT COUNT(*) as total FROM users WHERE role = 'Teacher'")
    teachers = cursor.fetchone()
    
    cursor.execute("SELECT COUNT(*) as total FROM courses")
    courses = cursor.fetchone()
    
    cursor.execute("SELECT COUNT(*) as total FROM attendance_sessions")
    sessions = cursor.fetchone()
    
    cursor.close()
    conn.close()
    
    return jsonify({
        'status': 'success',
        'total_students': students['total'] if students else 0,
        'total_teachers': teachers['total'] if teachers else 0,
        'total_courses': courses['total'] if courses else 0,
        'total_sessions': sessions['total'] if sessions else 0
    })

@app.route('/admin_students', methods=['GET'])
@role_required(['Admin'])
def admin_students():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
        SELECT user_id, full_name, email, registration_no, phone
        FROM users WHERE role = 'Student'
    """)
    students = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify({'status': 'success', 'students': students})

@app.route('/admin_teachers', methods=['GET'])
@role_required(['Admin'])
def admin_teachers():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
        SELECT user_id, full_name, email, employee_id, qualification, phone
        FROM users WHERE role = 'Teacher'
    """)
    teachers = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify({'status': 'success', 'teachers': teachers})

# ============================================
# TEACHER APIs
# ============================================

@app.route('/teacher_courses', methods=['GET'])
@role_required(['Teacher'])
def get_teacher_courses():
    teacher_id = session.get('user_id')
    
    conn = get_db_connection()
    if conn is None:
        return jsonify({"status": "error", "message": "DB connection failed"}), 500
    
    cursor = conn.cursor(dictionary=True)
    
    cursor.execute("""
        SELECT 
            s.section_id,
            s.section_code,
            s.room_no,
            c.course_id,
            c.course_code,
            c.course_name,
            c.credit_hours,
            dep.dept_name
        FROM sections s
        JOIN course_semester cs ON s.cs_id = cs.cs_id
        JOIN courses c ON cs.course_id = c.course_id
        JOIN departments dep ON c.dept_id = dep.dept_id
        WHERE s.teacher_id = %s AND s.is_active = TRUE
    """, (teacher_id,))
    
    courses = cursor.fetchall()
    cursor.close()
    conn.close()
    
    return jsonify({"status": "success", "courses": courses})

@app.route('/start_session', methods=['POST'])
@role_required(['Teacher'])
def start_session():
    data = request.json
    teacher_id = session.get('user_id')
    section_id = data.get('section_id')

    if not section_id:
        return jsonify({"status": "error", "message": "Section ID missing"}), 400

    conn = get_db_connection()
    if conn is None:
        return jsonify({"status": "error", "message": "DB connection failed"}), 500

    cursor = conn.cursor(dictionary=True)

    today = date.today()
    now = datetime.now()
    session_token = str(uuid.uuid4())

    cursor.execute(
        """SELECT session_id FROM attendance_sessions 
           WHERE section_id = %s AND session_date = %s AND status = 'Active'""",
        (section_id, today)
    )
    existing = cursor.fetchone()
    
    if existing:
        session_id = existing['session_id']
    else:
        cursor.execute(
            """INSERT INTO attendance_sessions 
               (section_id, teacher_id, session_date, start_time, session_token, mode, status) 
               VALUES (%s, %s, %s, %s, %s, 'Hybrid', 'Active')""",
            (section_id, teacher_id, today, now, session_token)
        )
        session_id = cursor.lastrowid
        conn.commit()

    qr_data = f"SESSION:{session_id}:{now.timestamp()}"
    qr_img = qrcode.make(qr_data)

    buf = io.BytesIO()
    qr_img.save(buf, format="PNG")
    qr_base64 = base64.b64encode(buf.getvalue()).decode('utf-8')

    cursor.execute(
        "UPDATE attendance_sessions SET qr_code = %s, qr_generated_at = %s WHERE session_id = %s",
        (qr_base64, now, session_id)
    )
    conn.commit()

    cursor.close()
    conn.close()

    return jsonify({
        "status": "success",
        "session_id": session_id,
        "qr_code": qr_base64
    })

@app.route('/attendance_list', methods=['GET'])
@role_required(['Teacher'])
def get_attendance_list():
    session_id = request.args.get('session_id')
    
    if not session_id:
        return jsonify({"status": "error", "message": "Session ID missing"}), 400

    conn = get_db_connection()
    if conn is None:
        return jsonify({"status": "error", "message": "DB connection failed"}), 500

    cursor = conn.cursor(dictionary=True)
    
    cursor.execute("""
        SELECT 
            u.user_id,
            u.full_name as student_name,
            u.registration_no,
            CASE WHEN ar.record_id IS NOT NULL THEN 'present' ELSE 'absent' END as status,
            ar.mode,
            ar.marked_at
        FROM student_enrollment se
        JOIN users u ON se.student_id = u.user_id
        LEFT JOIN attendance_records ar ON ar.student_id = u.user_id AND ar.session_id = %s
        WHERE se.section_id = (SELECT section_id FROM attendance_sessions WHERE session_id = %s)
        ORDER BY u.full_name
    """, (session_id, session_id))
    
    records = cursor.fetchall()
    cursor.close()
    conn.close()

    return jsonify({"status": "success", "attendance": records})

@app.route('/close_session', methods=['POST'])
@role_required(['Teacher'])
def close_session():
    data = request.json
    session_id = data.get('session_id')
    
    if not session_id:
        return jsonify({"status": "error", "message": "Session ID missing"}), 400
    
    conn = get_db_connection()
    if conn is None:
        return jsonify({"status": "error", "message": "DB connection failed"}), 500
    
    cursor = conn.cursor()
    
    cursor.execute(
        "UPDATE attendance_sessions SET status = 'Closed', end_time = %s WHERE session_id = %s",
        (datetime.now(), session_id)
    )
    conn.commit()
    
    cursor.close()
    conn.close()
    
    return jsonify({"status": "success", "message": "Session closed successfully"})

# ============================================
# STUDENT APIs
# ============================================

@app.route('/mark_attendance', methods=['POST'])
@role_required(['Student'])
def mark_attendance():
    data = request.json
    student_id = session.get('user_id')
    session_id = data.get('session_id')
    mode = data.get('mode', 'QR')

    if not session_id:
        return jsonify({"status": "error", "message": "Session ID missing"}), 400

    conn = get_db_connection()
    if conn is None:
        return jsonify({"status": "error", "message": "DB connection failed"}), 500

    cursor = conn.cursor()

    # Check if session exists and is active
    cursor.execute(
        "SELECT status FROM attendance_sessions WHERE session_id = %s",
        (session_id,)
    )
    session_result = cursor.fetchone()
    
    if not session_result:
        cursor.close()
        conn.close()
        return jsonify({"status": "error", "message": "Session not found"}), 400
    
    if session_result[0] != 'Active':
        cursor.close()
        conn.close()
        return jsonify({"status": "error", "message": "Session is not active"}), 400

    # Check duplicate attendance
    cursor.execute(
        "SELECT record_id FROM attendance_records WHERE session_id=%s AND student_id=%s",
        (session_id, student_id)
    )
    if cursor.fetchone():
        cursor.close()
        conn.close()
        return jsonify({"status": "error", "message": "Attendance already marked"}), 400

    # Insert attendance
    cursor.execute("""
        INSERT INTO attendance_records (session_id, student_id, mode, status, sync_status) 
        VALUES (%s, %s, %s, 'Present', 'Synced')
    """, (session_id, student_id, mode))
    conn.commit()
    
    cursor.close()
    conn.close()

    return jsonify({"status": "success", "message": "Attendance marked successfully!"})

@app.route('/my_attendance', methods=['GET'])
@role_required(['Student'])
def get_my_attendance():
    student_id = session.get('user_id')
    
    conn = get_db_connection()
    if conn is None:
        return jsonify({"status": "error", "message": "DB connection failed"}), 500
    
    cursor = conn.cursor(dictionary=True)
    
    cursor.execute("""
    SELECT
        c.course_code,
        c.course_name,
        COUNT(DISTINCT CASE WHEN ar.status = 'Present' THEN ar.record_id END) as present_days,
        COUNT(DISTINCT ar.record_id) as total_sessions,
        ROUND(
            COUNT(DISTINCT CASE WHEN ar.status = 'Present' THEN ar.record_id END) * 100.0 /
            NULLIF(COUNT(DISTINCT ar.record_id), 0),
        2) as percentage
    FROM attendance_records ar
    JOIN sections sec ON ar.section_id = sec.section_id
    JOIN course_semester cs ON sec.cs_id = cs.cs_id
    JOIN courses c ON cs.course_id = c.course_id
    WHERE ar.student_id = %s
    GROUP BY c.course_code, c.course_name
""", (session['user_id'],))
    
    attendance = cursor.fetchall()
    cursor.close()
    conn.close()
    
    return jsonify({"status": "success", "attendance": attendance})

# ============================================
# RUN APP
# ============================================


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)

