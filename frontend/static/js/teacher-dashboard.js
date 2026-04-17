// ============================================
// TEACHER DASHBOARD - COMPLETE UPDATED CODE
// ============================================

// Get user from localStorage
const user = JSON.parse(localStorage.getItem('user'));
const userId = localStorage.getItem('userId');
const userRole = localStorage.getItem('userRole');

// Role check
if (!user || !userId || userRole !== 'Teacher') {
    alert('Access Denied. Teachers only.');
    window.location.href = '/';
}

// Global variables
let currentSessionId = null;
let currentSectionId = null;
let refreshInterval = null;
let currentMode = 'QR';

// Display teacher name
document.getElementById('teacherName').textContent = user.name;

// ============================================
// API CALL FUNCTION WITH SESSION
// ============================================

async function apiCall(url, options = {}) {
    const defaultOptions = {
        method: 'GET',
        credentials: 'include',  // Important for session cookie
        headers: {
            'Content-Type': 'application/json'
        }
    };
    
    const mergedOptions = { ...defaultOptions, ...options };
    
    try {
        const response = await fetch(url, mergedOptions);
        
        if (response.status === 401 || response.status === 403) {
            alert('Session expired. Please login again.');
            localStorage.clear();
            window.location.href = '/';
            return null;
        }
        
        return response;
    } catch (error) {
        console.error('API call error:', error);
        return null;
    }
}

// ============================================
// LOAD COURSES
// ============================================

async function loadCourses() {
    try {
        const response = await apiCall('http://127.0.0.1:5000/teacher_courses');
        if (!response) return;
        
        const data = await response.json();
        
        if (data.status === 'success' && data.courses.length > 0) {
            const courseList = document.getElementById('courseList');
            courseList.innerHTML = '';
            
            data.courses.forEach(course => {
                const courseCard = document.createElement('div');
                courseCard.className = 'course-card';
                courseCard.innerHTML = `
                    <div class="course-code">${course.course_code}</div>
                    <div class="course-name">${course.course_name}</div>
                    <div class="course-detail">Section: ${course.section_code} | Room: ${course.room_no || 'N/A'}</div>
                    <button class="start-btn" onclick="startSession(${course.section_id}, '${course.course_code}')">
                        <i class="fas fa-play"></i> Start Session
                    </button>
                `;
                courseList.appendChild(courseCard);
            });
        } else {
            document.getElementById('courseList').innerHTML = '<div class="loading-spinner">No courses assigned</div>';
        }
    } catch (err) {
        console.error('Error loading courses:', err);
        document.getElementById('courseList').innerHTML = '<div class="loading-spinner">Error loading courses</div>';
    }
}

// ============================================
// SET ATTENDANCE MODE
// ============================================

function setMode(mode, button) {
    currentMode = mode;
    document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
    console.log(`Mode set to: ${mode}`);
}

// ============================================
// START SESSION
// ============================================

async function startSession(sectionId, courseCode) {
    currentSectionId = sectionId;
    
    try {
        const response = await fetch('http://127.0.0.1:5000/start_session', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ section_id: sectionId })
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            currentSessionId = data.session_id;
            
            // Show session UI
            const activeSession = document.getElementById('activeSession');
            const qrSection = document.getElementById('qrSection');
            const attendanceList = document.getElementById('attendanceList');
            
            if (activeSession) activeSession.classList.remove('hidden');
            if (qrSection) qrSection.classList.remove('hidden');
            if (attendanceList) attendanceList.classList.remove('hidden');
            
            const activeCourseName = document.getElementById('activeCourseName');
            if (activeCourseName) activeCourseName.textContent = courseCode;
            
            const qrPlaceholder = document.getElementById('qrPlaceholder');
            const qrImg = document.getElementById('qrImg');
            const qrMsg = document.getElementById('qrMsg');
            
            if (qrPlaceholder) qrPlaceholder.classList.add('hidden');
            if (qrImg) {
                qrImg.classList.remove('hidden');
                qrImg.src = 'data:image/png;base64,' + data.qr_code;
            }
            if (qrMsg) qrMsg.textContent = 'Session started! Students can scan QR code.';
            
            // Start auto-refresh
            if (refreshInterval) clearInterval(refreshInterval);
            refreshInterval = setInterval(loadAttendanceList, 5000);
            
            loadAttendanceList();
        }
    } catch (err) {
        console.error('Error starting session:', err);
        const qrMsg = document.getElementById('qrMsg');
        if (qrMsg) qrMsg.textContent = 'Error starting session';
    }
}

// ============================================
// LOAD ATTENDANCE LIST
// ============================================

async function loadAttendanceList() {
    if (!currentSessionId) return;
    
    try {
        const response = await fetch(`http://127.0.0.1:5000/attendance_list?session_id=${currentSessionId}`, {
            credentials: 'include'
        });
        const data = await response.json();
        
        if (data.status === 'success') {
            const tbody = document.getElementById('attendanceTableBody');
            if (!tbody) return;
            
            tbody.innerHTML = '';
            
            let presentCount = 0;
            data.attendance.forEach(record => {
                const row = tbody.insertRow();
                row.innerHTML = `
                    <td>${record.student_name}</td>
                    <td>${record.marked_at ? new Date(record.marked_at).toLocaleTimeString() : '-'}</td>
                    <td class="attendance-mode">${record.mode || '-'}</td>
                    <td><span class="attendance-status ${record.status === 'present' ? 'status-present' : 'status-absent'}">${record.status}</span></td>
                `;
                if (record.status === 'present') presentCount++;
            });
            
            const presentCountSpan = document.getElementById('presentCount');
            const totalStudentsSpan = document.getElementById('totalStudents');
            
            if (presentCountSpan) presentCountSpan.textContent = presentCount;
            if (totalStudentsSpan) totalStudentsSpan.textContent = data.attendance.length;
        }
    } catch (err) {
        console.error('Error loading attendance:', err);
    }
}

// ============================================
// CLOSE SESSION
// ============================================

async function closeSession() {
    if (!confirm('Are you sure you want to close this session?')) return;
    
    try {
        await fetch('http://127.0.0.1:5000/close_session', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: currentSessionId })
        });
        
        currentSessionId = null;
        if (refreshInterval) clearInterval(refreshInterval);
        
        const activeSession = document.getElementById('activeSession');
        const qrSection = document.getElementById('qrSection');
        const attendanceList = document.getElementById('attendanceList');
        const qrPlaceholder = document.getElementById('qrPlaceholder');
        const qrImg = document.getElementById('qrImg');
        
        if (activeSession) activeSession.classList.add('hidden');
        if (qrSection) qrSection.classList.add('hidden');
        if (attendanceList) attendanceList.classList.add('hidden');
        if (qrPlaceholder) qrPlaceholder.classList.remove('hidden');
        if (qrImg) qrImg.classList.add('hidden');
        
        loadCourses();
    } catch (err) {
        console.error('Error closing session:', err);
    }
}

// ============================================
// EXTEND SESSION (Optional)
// ============================================

function extendSession() {
    const minutes = prompt('Extend session by how many minutes?', '15');
    if (minutes && !isNaN(minutes)) {
        alert(`Session extended by ${minutes} minutes`);
        // In real app, call backend API
    }
}

// ============================================
// LOGOUT
// ============================================

async function logout() {
    try {
        await fetch('http://127.0.0.1:5000/logout', {
            method: 'POST',
            credentials: 'include'
        });
    } catch (err) {
        console.error('Logout error:', err);
    }
    localStorage.clear();
    window.location.href = '/';
}

// ============================================
// INITIALIZE
// ============================================

loadCourses();