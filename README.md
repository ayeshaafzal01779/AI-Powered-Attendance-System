# AI Powered Attendance System

## Final Year Design Project (FYDP) 2026

### University of the Punjab, Gujranwala Campus

---

## Project Overview

This is a Role-Based Attendance Management System developed for BSIT 8th Semester (Session 2022-2026). The system provides separate dashboards for Students, Teachers, and Admin with real-time attendance tracking, face recognition, and QR code scanning.

---

## Features

- Role-Based Access (Student, Teacher, Admin)
- QR Code Attendance Scanning
- Face Recognition Attendance
- Teacher Manual Attendance Marking
- Admin Dashboard with Analytics
- PDF/Excel Attendance Reports
- Fine Management System
- Email Notifications
- AI Chatbot Assistant
- Responsive Design

---

## Technology Stack

- **Backend:** Python Flask
- **Database:** MySQL 8.0
- **Frontend:** HTML5, CSS3, JavaScript
- **Charts:** Chart.js
- **Face Recognition:** dlib, face-recognition, OpenCV
- **AI Chatbot:** OpenRouter API
- **Email:** Gmail SMTP
- **Icons:** Font Awesome

---

## Project Structure

├── backend/
│ ├── app.py
│ ├── database.py
│ ├── face_utils.py
│ └── dataset/
├── frontend/
│ ├── templates/
│ │ ├── index.html
│ │ ├── student_dashboard.html
│ │ ├── teacher_dashboard.html
│ │ └── admin_dashboard.html
│ └── static/
│ ├── css/
│ ├── js/
│ └── images/
├── database/
│ └── schema.sql
├── requirements.txt
└── README.md

---

## Setup Instructions

### Prerequisites

- Python 3.11+
- MySQL 8.0+

### Installation

```bash
# Clone repository
git clone https://github.com/ayeshaafzal01779/AI-Powered-Attendance-System.git

# Install dependencies
pip install -r requirements.txt

# Setup database
mysql -u root -p < database/schema.sql

# Run application
python backend/app.py

# Open browser: http://localhost:5000
```
---

## User Roles
Role	Access
Admin	Manage users, departments, fines, reports
Teacher	Start sessions, mark attendance, download reports
Student	View attendance, scan QR, face recognition

---

## Team Members
Name	Roll No
Ayesha Afzal	BIT22022
Meerab Gohar	BIT22029
Aqsa Bibi	BIT21005

Program: BSIT (8th Semester, 2022-2026)
University: University of the Punjab, Gujranwala Campus

---

## Academic Purpose
This project is developed for academic purposes as part of the Final Year Design Project (FYDP).

---

## License
This project is for educational and academic use only.
```
