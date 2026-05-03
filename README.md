# AI-Powered Attendance Management System

### Final Year Design Project (FYDP) 2026
**University of the Punjab, Gujranwala Campus**

---

## Project Overview
The AI-Powered Attendance Management System is a comprehensive platform designed to automate attendance tracking through modern authentication methods. Developed for the BSIT 8th Semester (Session 2022-2026), the system leverages Face Recognition, Dynamic QR Code Scanning, and an AI Chatbot to ensure accurate and efficient attendance management for educational institutions.

---

## Core Features
*   **Role-Based Access Control**: Dedicated dashboards for Students, Teachers, and Administrators with granular permissions.
*   **Biometric Authentication**: Automated attendance marking utilizing Face Recognition technology (OpenCV and dlib).
*   **Dynamic QR Scanning**: Time-sensitive QR code generation for secure, location-based attendance verification.
*   **Intelligent Assistant**: Integrated AI Chatbot powered by the OpenRouter API for real-time user support.
*   **Financial Management**: Tracking and processing of student fines with Stripe payment gateway integration.
*   **Automated Communication**: SMTP-based email notifications for attendance alerts, fine updates, and system reports.
*   **Data Analytics**: Comprehensive visualization of attendance trends using Chart.js and exportable reports in PDF/Excel formats.

---

## Technology Stack
| Category | Technologies |
|---|---|
| **Backend** | Python, Flask, MySQL |
| **Frontend** | JavaScript (ES6+), HTML5, CSS3, Chart.js |
| **AI/ML** | dlib, face-recognition, OpenCV |
| **Integrations** | Stripe API, OpenRouter API, Gmail SMTP |
| **Infrastructure** | Docker, Docker Compose |

---

## Project Structure
```text
Trimode/
├── backend/                # Flask application core logic
│   ├── app.py              # API routes and server configuration
│   ├── database.py         # Database abstraction layer
│   ├── face_utils.py       # Computer vision and face processing
│   └── datasets/           # Student biometric data storage
├── frontend/               # User interface assets
│   ├── static/             # Compiled CSS, JS, and image assets
│   └── templates/          # Jinja2 HTML templates
├── database/               # SQL schema and migration scripts
├── Dockerfile              # Containerization configuration
├── compose.yaml            # Multi-container orchestration
├── requirements.txt        # Python dependency manifest
└── .env.example            # Environment configuration template
```

---

## Installation and Setup

### Prerequisites
*   Python 3.11 or higher
*   MySQL 8.0 or higher
*   Docker and Docker Compose (Recommended)

### Deployment via Docker
1. **Clone the Repository**
   ```bash
   git clone https://github.com/ayeshaafzal01779/AI-Powered-Attendance-System.git
   cd AI-Powered-Attendance-System
   ```
2. **Environment Configuration**
   - Rename `.env.example` to `.env`.
   - Populate the file with valid API keys and database credentials.
3. **Execution**
   ```bash
   docker-compose up --build
   ```
4. **Access**
   - The application will be available at `http://localhost:5000`.

### Manual Installation
1. **Dependency Installation**
   ```bash
   pip install -r requirements.txt
   ```
2. **Database Initialization**
   - Create a MySQL database: `TriAttendanceDB`.
   - Import the schema: `mysql -u root -p TriAttendanceDB < database/fresh_dump.sql`
3. **Start Application**
   ```bash
   python backend/app.py
   ```

---

## Configuration Details (.env)
The following environment variables are required for full system functionality:
*   `FLASK_SECRET_KEY`: Security key for session management.
*   `DB_HOST/USER/PASSWORD`: Database connection parameters.
*   `GMAIL_USER/PASSWORD`: Credentials for SMTP notification service.
*   `OPENROUTER_API_KEY`: Authentication for AI Chatbot features.
*   `STRIPE_SECRET_KEY`: Integration key for payment processing.

---

## Development Team
| Name | Roll Number |
| :--- | :--- |
| Ayesha Afzal | BIT22022 |
| Meerab Gohar | BIT22029 |
| Aqsa Bibi | BIT21005 |

**Program:** BSIT (8th Semester, 2022-2026)  
**University:** University of the Punjab, Gujranwala Campus

---

## License and Usage
This project is developed strictly for academic and educational purposes as part of the Final Year Design Project (FYDP) requirements.
```
