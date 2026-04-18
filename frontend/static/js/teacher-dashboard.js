// ============================================
// TEACHER DASHBOARD - COMPLETE UPDATED
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
let refreshInterval = null;
let qrRefreshInterval = null;
let countdownInterval = null;
let isQRCodeActive = false;

// Display teacher name
const teacherNameEl = document.getElementById('teacherName');
if (teacherNameEl) teacherNameEl.textContent = user.name;

// Display today's date
const today = new Date();
const todayDateEl = document.getElementById('todayDate');
if (todayDateEl) todayDateEl.textContent = today.toLocaleDateString();

// ============================================
// API CALL FUNCTION
// ============================================

async function apiCall(url, options = {}) {
    const defaultOptions = {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
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
    const courseList = document.getElementById('courseList');
    if (!courseList) return;
    
    try {
        const response = await apiCall('http://127.0.0.1:5000/teacher_courses');
        if (!response) return;
        
        const data = await response.json();
        
        if (data.status === 'success' && data.courses.length > 0) {
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
            courseList.innerHTML = '<div class="loading-spinner">No courses assigned</div>';
        }
    } catch (err) {
        console.error('Error loading courses:', err);
        courseList.innerHTML = '<div class="loading-spinner">Error loading courses</div>';
    }
}

// ============================================
// START SESSION
// ============================================

async function startSession(sectionId, courseCode) {
    const startBtn = event?.target;
    if (startBtn) {
        startBtn.disabled = true;
        startBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Starting...';
    }
    
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
            
            // Show UI sections
            const activeSession = document.getElementById('activeSession');
            const modeSelector = document.getElementById('modeSelector');
            const attendanceList = document.getElementById('attendanceList');
            
            if (activeSession) activeSession.classList.remove('hidden');
            if (modeSelector) modeSelector.classList.remove('hidden');
            if (attendanceList) attendanceList.classList.remove('hidden');
            
            const activeCourseName = document.getElementById('activeCourseName');
            if (activeCourseName) activeCourseName.textContent = courseCode;
            
            // No default mode selected
            document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
            
            // Start auto-refresh
            if (refreshInterval) clearInterval(refreshInterval);
            refreshInterval = setInterval(loadAttendanceList, 5000);
            
            loadAttendanceList();
        }
    } catch (err) {
        console.error('Error starting session:', err);
        alert('Error starting session');
    } finally {
        if (startBtn) {
            startBtn.disabled = false;
            startBtn.innerHTML = '<i class="fas fa-play"></i> Start Session';
        }
    }
}

// ============================================
// SELECT MODE - FIXED
// ============================================

function selectMode(mode, button) {
    // Update active button
    document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
    
    // Hide all sections
    const qrSection = document.getElementById('qrSection');
    const faceSection = document.getElementById('faceSection');
    const manualSection = document.getElementById('manualSection');
    
    if (qrSection) qrSection.classList.add('hidden');
    if (faceSection) faceSection.classList.add('hidden');
    if (manualSection) manualSection.classList.add('hidden');
    
    // Show selected section
    if (mode === 'QR') {
        if (qrSection) qrSection.classList.remove('hidden');
        
        // Get elements
        const qrPlaceholder = document.getElementById('qrPlaceholder');
        const qrImg = document.getElementById('qrImg');
        const startBtn = document.getElementById('startQrBtn');
        const stopBtn = document.getElementById('stopQrBtn');
        const refreshBtn = document.getElementById('refreshQrBtn');
        const qrCountdown = document.getElementById('qrCountdown');
        const qrMsg = document.getElementById('qrMsg');
        
        // Update placeholder content
        if (qrPlaceholder) {
            qrPlaceholder.innerHTML = `
                <i class="fas fa-qrcode fa-5x mb-3"></i>
                <p>Ready to start QR attendance</p>
                <small>Click "Start QR" to generate code</small>
            `;
            qrPlaceholder.classList.remove('hidden');
        }
        
        if (qrImg) qrImg.classList.add('hidden');
        if (startBtn) startBtn.classList.remove('hidden');
        if (stopBtn) stopBtn.classList.add('hidden');
        if (refreshBtn) refreshBtn.classList.add('hidden');
        if (qrCountdown) qrCountdown.textContent = '--';
        
        // Update message
        if (qrMsg) {
            qrMsg.innerHTML = '<i class="fas fa-qrcode"></i> QR mode selected. Click "Start QR" to begin.';
            qrMsg.style.color = '#2980b9';
        }
        
        isQRCodeActive = false;
        
        // Clear intervals
        if (qrRefreshInterval) clearInterval(qrRefreshInterval);
        if (countdownInterval) clearInterval(countdownInterval);
        qrRefreshInterval = null;
        countdownInterval = null;
        
    } else if (mode === 'Face') {
        if (faceSection) faceSection.classList.remove('hidden');
    } else if (mode === 'Manual') {
        if (manualSection) manualSection.classList.remove('hidden');
    }
}

// ============================================
// ACTIVATE QR MODE
// ============================================

async function activateQRMode() {
    if (!currentSessionId) {
        alert('Please start a session first');
        return;
    }
    
    const startBtn = document.getElementById('startQrBtn');
    const stopBtn = document.getElementById('stopQrBtn');
    const refreshBtn = document.getElementById('refreshQrBtn');
    const qrMsg = document.getElementById('qrMsg');
    const qrPlaceholder = document.getElementById('qrPlaceholder');
    const qrImg = document.getElementById('qrImg');
    
    if (!startBtn) return;
    
    startBtn.disabled = true;
    startBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
    
    try {
        const response = await fetch('http://127.0.0.1:5000/generate_qr', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: currentSessionId })
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            isQRCodeActive = true;
            
            // Hide placeholder, show QR image
            if (qrPlaceholder) qrPlaceholder.classList.add('hidden');
            if (qrImg) {
                qrImg.classList.remove('hidden');
                qrImg.src = 'data:image/png;base64,' + data.qr_code;
            }
            
            // Update buttons
            startBtn.classList.add('hidden');
            if (stopBtn) stopBtn.classList.remove('hidden');
            if (refreshBtn) refreshBtn.classList.remove('hidden');
            
            // Start countdown
            startCountdown(data.expires_in || 15);
            
            // Set refresh interval
            if (qrRefreshInterval) clearInterval(qrRefreshInterval);
            qrRefreshInterval = setInterval(refreshQRCode, (data.expires_in || 15) * 1000);
            
            if (qrMsg) {
                qrMsg.innerHTML = '<i class="fas fa-check-circle"></i> QR Code active! Students can scan now.';
                qrMsg.style.color = '#27ae60';
            }
        } else {
            alert('Failed to generate QR code');
            startBtn.disabled = false;
            startBtn.innerHTML = '<i class="fas fa-play"></i> Start QR';
        }
    } catch (err) {
        console.error('Error activating QR:', err);
        alert('Error generating QR code');
        startBtn.disabled = false;
        startBtn.innerHTML = '<i class="fas fa-play"></i> Start QR';
    }
}

// ============================================
// DEACTIVATE QR MODE
// ============================================

function deactivateQRMode() {
    if (!confirm('Stop QR code? Students will no longer be able to scan.')) return;
    
    isQRCodeActive = false;
    
    // Clear intervals
    if (qrRefreshInterval) clearInterval(qrRefreshInterval);
    if (countdownInterval) clearInterval(countdownInterval);
    qrRefreshInterval = null;
    countdownInterval = null;
    
    // Reset UI
    const qrPlaceholder = document.getElementById('qrPlaceholder');
    const qrImg = document.getElementById('qrImg');
    const startBtn = document.getElementById('startQrBtn');
    const stopBtn = document.getElementById('stopQrBtn');
    const refreshBtn = document.getElementById('refreshQrBtn');
    const qrCountdown = document.getElementById('qrCountdown');
    const qrMsg = document.getElementById('qrMsg');
    
    // Show placeholder with proper message
    if (qrPlaceholder) {
        qrPlaceholder.innerHTML = `
            <i class="fas fa-qrcode fa-5x mb-3"></i>
            <p>Ready to start QR attendance</p>
            <small>Click "Start QR" to generate code</small>
        `;
        qrPlaceholder.classList.remove('hidden');
    }
    
    if (qrImg) qrImg.classList.add('hidden');
    if (startBtn) startBtn.classList.remove('hidden');
    if (stopBtn) stopBtn.classList.add('hidden');
    if (refreshBtn) refreshBtn.classList.add('hidden');
    if (qrCountdown) qrCountdown.textContent = '--';
    
    // Reset button state
    if (startBtn) {
        startBtn.disabled = false;
        startBtn.innerHTML = '<i class="fas fa-play"></i> Start QR';
    }
    
    if (qrMsg) {
        qrMsg.innerHTML = '<i class="fas fa-info-circle"></i> QR code stopped. Click "Start QR" to activate again.';
        qrMsg.style.color = '#3498db';
    }
}

// ============================================
// START COUNTDOWN
// ============================================

function startCountdown(seconds) {
    if (countdownInterval) clearInterval(countdownInterval);
    
    let remaining = seconds;
    const countdownElement = document.getElementById('qrCountdown');
    if (!countdownElement) return;
    
    countdownElement.textContent = remaining;
    
    countdownInterval = setInterval(() => {
        remaining--;
        countdownElement.textContent = remaining >= 0 ? remaining : 0;
        
        if (remaining <= 0) {
            clearInterval(countdownInterval);
            if (isQRCodeActive) {
                refreshQRCode();
            }
        }
    }, 1000);
}

// ============================================
// REFRESH QR CODE
// ============================================

async function refreshQRCode() {
    if (!currentSessionId || !isQRCodeActive) return;
    
    try {
        const response = await fetch('http://127.0.0.1:5000/refresh_qr', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: currentSessionId })
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            const qrImg = document.getElementById('qrImg');
            if (qrImg) {
                qrImg.src = 'data:image/png;base64,' + data.qr_code;
            }
            startCountdown(data.expires_in || 15);
            
            // Show refresh message temporarily
            const qrMsg = document.getElementById('qrMsg');
            if (qrMsg) {
                const originalMsg = qrMsg.innerHTML;
                qrMsg.innerHTML = '<i class="fas fa-sync-alt"></i> QR Code refreshed!';
                setTimeout(() => {
                    if (isQRCodeActive) {
                        qrMsg.innerHTML = '<i class="fas fa-check-circle"></i> QR Code active! Students can scan now.';
                    }
                }, 2000);
            }
        }
    } catch (err) {
        console.error('Error refreshing QR:', err);
    }
}

async function manualRefreshQR() {
    if (isQRCodeActive) {
        await refreshQRCode();
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
            let serialNo = 1;
            
            data.attendance.forEach(record => {
                const row = tbody.insertRow();
                const statusText = record.status === 'present' ? 'Present' : 'Absent';
                const statusClass = record.status === 'present' ? 'status-present' : 'status-absent';
                const timeText = record.marked_at ? new Date(record.marked_at).toLocaleTimeString() : '--:--';
                const modeText = record.mode || '--';
                
                row.innerHTML = `
                    <td style="width: 50px;">${serialNo++}</td>
                    <td><strong>${record.student_name}</strong></td>
                    <td>${record.registration_no || '-'}</td>
                    <td>${timeText}</td>
                    <td>${modeText}</td>
                    <td><span class="${statusClass}">${statusText}</span></td>
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
        isQRCodeActive = false;
        
        // Clear intervals
        if (refreshInterval) clearInterval(refreshInterval);
        if (qrRefreshInterval) clearInterval(qrRefreshInterval);
        if (countdownInterval) clearInterval(countdownInterval);
        refreshInterval = null;
        qrRefreshInterval = null;
        countdownInterval = null;
        
        // Hide UI sections
        const activeSession = document.getElementById('activeSession');
        const modeSelector = document.getElementById('modeSelector');
        const qrSection = document.getElementById('qrSection');
        const attendanceList = document.getElementById('attendanceList');
        
        if (activeSession) activeSession.classList.add('hidden');
        if (modeSelector) modeSelector.classList.add('hidden');
        if (qrSection) qrSection.classList.add('hidden');
        if (attendanceList) attendanceList.classList.add('hidden');
        
        // Reset QR display
        const qrPlaceholder = document.getElementById('qrPlaceholder');
        const qrImg = document.getElementById('qrImg');
        const qrCountdown = document.getElementById('qrCountdown');
        const startBtn = document.getElementById('startQrBtn');
        const stopBtn = document.getElementById('stopQrBtn');
        const refreshBtn = document.getElementById('refreshQrBtn');
        
        if (qrPlaceholder) {
            qrPlaceholder.innerHTML = `
                <i class="fas fa-qrcode fa-5x mb-3"></i>
                <p>No active QR code</p>
                <small>Select QR mode and click "Start QR"</small>
            `;
            qrPlaceholder.classList.remove('hidden');
        }
        if (qrImg) qrImg.classList.add('hidden');
        if (qrCountdown) qrCountdown.textContent = '--';
        if (startBtn) startBtn.classList.remove('hidden');
        if (stopBtn) stopBtn.classList.add('hidden');
        if (refreshBtn) refreshBtn.classList.add('hidden');
        
        // Reset mode buttons
        document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
        
        loadCourses();
        
        alert('Session closed successfully!');
    } catch (err) {
        console.error('Error closing session:', err);
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