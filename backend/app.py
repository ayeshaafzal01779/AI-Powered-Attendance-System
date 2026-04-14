from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime, date
import qrcode
import io
import base64
from database import get_db_connection  # Your DB connection function

app = Flask(__name__)
CORS(app)

# ===== LOGIN =====
@app.route('/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email')
    password = data.get('password')

    conn = get_db_connection()
    if conn is None:
        return jsonify({"status": "error", "message": "DB connection failed"}), 500

    cursor = conn.cursor(dictionary=True)
    cursor.execute(
        "SELECT id, name, role FROM users WHERE email=%s AND password=%s",
        (email, password)
    )
    user = cursor.fetchone()
    cursor.close()
    conn.close()

    if user:
        return jsonify({
            "status": "success",
            "user": {
                "id": user['id'],
                "name": user['name'],
                "role": user['role']
            }
        })
    else:
        return jsonify({"status": "error", "message": "Invalid credentials"}), 401

# ===== START SESSION + QR CODE =====
@app.route('/start_session', methods=['POST'])
def start_session():
    data = request.json
    teacher_id = data.get('teacher_id')
    course_id = data.get('course_id')

    if not teacher_id or not course_id:
        return jsonify({"status":"error","message":"Teacher ID or Course ID missing"}), 400

    conn = get_db_connection()
    if conn is None:
        return jsonify({"status":"error","message":"DB connection failed"}), 500

    cursor = conn.cursor(dictionary=True)

    today = date.today()
    now = datetime.now()

    # Check if session already exists for today (optional)
    cursor.execute(
        "SELECT id FROM sessions WHERE teacher_id=%s AND course_id=%s AND session_date=%s",
        (teacher_id, course_id, today)
    )
    existing = cursor.fetchone()
    if existing:
        session_id = existing['id']
    else:
        cursor.execute(
            "INSERT INTO sessions (teacher_id, course_id, session_date, start_time) VALUES (%s, %s, %s, %s)",
            (teacher_id, course_id, today, now.time())
        )
        session_id = cursor.lastrowid
        conn.commit()

    # --- QR Code generation ---
    qr_data = f"SESSION:{session_id}"  # You can add more info if needed
    qr_img = qrcode.make(qr_data)
    buf = io.BytesIO()
    qr_img.save(buf, format="PNG")
    qr_base64 = base64.b64encode(buf.getvalue()).decode('utf-8')

    cursor.close()
    conn.close()

    return jsonify({
        "status": "success",
        "session_id": session_id,
        "qr_code": qr_base64
    })

# ===== MARK ATTENDANCE =====
@app.route('/mark_attendance', methods=['POST'])
def mark_attendance():
    data = request.json
    student_id = data.get('student_id')
    session_id = data.get('session_id')
    mode = data.get('mode', 'QR')  # default mode QR

    if not student_id or not session_id:
        return jsonify({"status":"error","message":"Student ID or Session ID missing"}), 400

    conn = get_db_connection()
    if conn is None:
        return jsonify({"status":"error","message":"DB connection failed"}), 500

    cursor = conn.cursor()

    # Check duplicate attendance
    cursor.execute(
        "SELECT * FROM attendance WHERE session_id=%s AND student_id=%s",
        (session_id, student_id)
    )
    if cursor.fetchone():
        cursor.close()
        conn.close()
        return jsonify({"status":"error","message":"Attendance already marked"}), 400

    # Insert attendance
    cursor.execute(
        "INSERT INTO attendance (session_id, student_id, mode, marked_at) VALUES (%s, %s, %s, %s)",
        (session_id, student_id, mode, datetime.now())
    )
    conn.commit()
    cursor.close()
    conn.close()

    return jsonify({"status":"success","message":"Attendance marked"})

# ===== GET ATTENDANCE LIST =====
@app.route('/attendance_list', methods=['GET'])
def get_attendance_list():
    session_id = request.args.get('session_id')
    if not session_id:
        return jsonify({"status":"error","message":"Session ID missing"}), 400

    conn = get_db_connection()
    if conn is None:
        return jsonify({"status":"error","message":"DB connection failed"}), 500

    cursor = conn.cursor(dictionary=True)
    cursor.execute(
        """SELECT s.name AS student_name, a.mode, a.marked_at, 
                  CASE WHEN a.id IS NULL THEN 'absent' ELSE 'present' END AS status
           FROM students s
           LEFT JOIN attendance a 
           ON s.id = a.student_id AND a.session_id=%s""",
        (session_id,)
    )
    records = cursor.fetchall()
    cursor.close()
    conn.close()

    return jsonify({"status":"success","attendance":records})

# ===== TEST ROUTE =====
@app.route('/')
def home():
    return "Trimode Backend Running!"

if __name__ == '__main__':
    app.run(debug=True)