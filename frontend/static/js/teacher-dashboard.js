// ============================================
// TEACHER DASHBOARD - WITH DYNAMIC URL
// ============================================

const API_BASE_URL = 'http://' + window.location.hostname + ':5000';

// Get user from localStorage
const user = JSON.parse(localStorage.getItem('user'));
const userId = localStorage.getItem('userId');
const userRole = localStorage.getItem('userRole');

// Role check
if (!user || !userId || userRole !== 'Teacher') {
    Swal.fire({
        icon: 'error',
        title: 'Access Denied',
        text: 'Teachers only.',
        confirmButtonColor: '#2c3e50'
    }).then(() => {
        window.location.href = '/';
    });
}

// Global variables
let currentSessionId = null;
let currentActiveSectionId = null; // Track which section is active
let refreshInterval = null;
let qrRefreshInterval = null;
let countdownInterval = null;
let isQRCodeActive = false;
let teacherToastTimer = null;
let previousPresentStudentIds = new Set();
let manualRosterCache = [];
let selectedManualStudentIds = new Set();

const pkTimeFmt = new Intl.DateTimeFormat('en-PK', {
    timeZone: 'Asia/Karachi',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
});

function methodLabel(mode) {
    const m = (mode || '').toString().toLowerCase();
    if (!m) return '--';
    if (m === 'qr') return 'QR Scan';
    if (m === 'teacher') return 'Teacher Marked';
    if (m === 'student') return 'Student Self';
    // Backward compatibility for older data.
    if (m === 'manual') return 'Teacher Marked';
    return mode;
}

function formatPkTime(value) {
    if (!value) return '--:--';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '--:--';
    return pkTimeFmt.format(d);
}

function syncManualSelectAllCheckbox() {
    const selAll = document.getElementById('manualSelectAll');
    if (!selAll) return;
    const checks = document.querySelectorAll('#manualTableBody .manual-row-check');
    if (checks.length === 0) {
        selAll.checked = false;
        return;
    }
    selAll.checked = Array.from(checks).every(c => c.checked);
}

function showTeacherToast(text, type = 'info') {
    const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 4000,
        timerProgressBar: true,
        background: '#ffffff',
        color: '#1e293b',
        iconColor: type === 'success' ? '#10b981' : (type === 'error' ? '#ef4444' : '#3b82f6'),
        didOpen: (toast) => {
            toast.addEventListener('mouseenter', Swal.stopTimer)
            toast.addEventListener('mouseleave', Swal.resumeTimer)
            toast.style.borderRadius = '12px'
            toast.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
            toast.style.borderLeft = `6px solid ${type === 'success' ? '#10b981' : (type === 'error' ? '#ef4444' : '#3b82f6')}`
        }
    });
    
    Toast.fire({
        icon: type === 'success' ? 'success' : (type === 'error' ? 'error' : 'info'),
        title: `<div style="font-weight: 700; font-size: 15px; margin-bottom: 2px;">${type.charAt(0).toUpperCase() + type.slice(1)}</div><div style="font-weight: 400; font-size: 13px; color: #64748b;">${text}</div>`
    });
}

function updateActiveSessionIdDisplay() {
    const sessionIdEl = document.getElementById('activeSessionId');
    if (sessionIdEl) {
        sessionIdEl.textContent = currentSessionId || '--';
    }
    const faceSessionIdEl = document.getElementById('faceSessionIdDisplay');
    if (faceSessionIdEl) {
        faceSessionIdEl.textContent = currentSessionId || '--';
    }
}

async function copySessionId(event) {
    if (event) event.stopPropagation();
    if (!currentSessionId) {
        return;
    }

    const copyIcon = document.getElementById('copySessionIcon');
    const valueToCopy = String(currentSessionId);

    const markCopied = () => {
        if (!copyIcon) return;
        copyIcon.classList.add('copied');
        
        // Use SweetAlert2 for a professional toast
        const Toast = Swal.mixin({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 2000,
            timerProgressBar: true
        });
        
        Toast.fire({
            icon: 'success',
            title: 'Session ID copied!'
        });

        setTimeout(() => copyIcon.classList.remove('copied'), 900);
    };

    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(valueToCopy);
            markCopied();
            return;
        }
    } catch (err) {
        console.error('Clipboard copy failed, using fallback:', err);
    }

    const tempInput = document.createElement('input');
    tempInput.value = valueToCopy;
    document.body.appendChild(tempInput);
    tempInput.select();
    document.execCommand('copy');
    document.body.removeChild(tempInput);
    markCopied();
}

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
    const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
    
    const defaultOptions = {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
    };
    
    const mergedOptions = { ...defaultOptions, ...options };
    
    try {
        const response = await fetch(fullUrl, mergedOptions);
        
        if (response.status === 401 || response.status === 403) {
            Swal.fire({
                icon: 'warning',
                title: 'Session Expired',
                text: 'Please login again.',
                confirmButtonColor: '#2c3e50'
            }).then(() => {
                localStorage.clear();
                window.location.href = '/';
            });
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
        const response = await apiCall('/teacher_courses');
        if (!response) return;
        
        const data = await response.json();
        
        if (data.status === 'success' && data.courses.length > 0) {
            courseList.innerHTML = '';
            
            data.courses.forEach(course => {
                const isActive = currentActiveSectionId === course.section_id;
                const courseCard = document.createElement('div');
                courseCard.className = `course-card ${isActive ? 'active' : ''}`;
                courseCard.innerHTML = `
                    <div class="course-code">${course.course_code} ${isActive ? '<span class="active-badge"><i class="fas fa-signal"></i> LIVE</span>' : ''}</div>
                    <div class="course-name">${course.course_name}</div>
                    <div class="course-detail">Section: ${course.section_code} | Room: ${course.room_no || 'N/A'}</div>
                    <button class="start-btn" onclick="startSession(${course.section_id}, '${course.course_code}')" ${isActive ? 'disabled' : ''}>
                        <i class="fas ${isActive ? 'fa-check' : 'fa-play'}"></i> ${isActive ? 'Session Active' : 'Start Session'}
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
        const response = await fetch(`${API_BASE_URL}/start_session`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ section_id: sectionId })
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            currentSessionId = data.session_id;
            currentActiveSectionId = sectionId; // Set active section ID
            updateActiveSessionIdDisplay();
            
            // Refresh course list to show active state
            loadCourses();
            
            const activeSession = document.getElementById('activeSession');
            const modeSelector = document.getElementById('modeSelector');
            const attendanceList = document.getElementById('attendanceList');
            
            if (activeSession) activeSession.classList.remove('hidden');
            if (modeSelector) modeSelector.classList.remove('hidden');
            if (attendanceList) attendanceList.classList.remove('hidden');
            
            const activeCourseName = document.getElementById('activeCourseName');
            if (activeCourseName) activeCourseName.textContent = courseCode;
            
            document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
            
            if (refreshInterval) clearInterval(refreshInterval);
            refreshInterval = setInterval(loadAttendanceList, 5000);
            
            loadAttendanceList();
        }
    } catch (err) {
        console.error('Error starting session:', err);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Unable to start session'
        });
    } finally {
        if (startBtn) {
            startBtn.disabled = false;
            startBtn.innerHTML = '<i class="fas fa-play"></i> Start Session';
        }
    }
}

// ============================================
// SELECT MODE
// ============================================

function selectMode(mode, button) {
    const isAlreadyActive = button.classList.contains('active');

    // Remove active class from all buttons
    document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
    
    const qrSection = document.getElementById('qrSection');
    const faceSection = document.getElementById('faceSection');
    const manualSection = document.getElementById('manualSection');
    
    // Hide all sections
    if (qrSection) qrSection.classList.add('hidden');
    if (faceSection) faceSection.classList.add('hidden');
    if (manualSection) manualSection.classList.add('hidden');

    stopFaceRecognition();

    // If it was already active, we just toggle it off and return
    if (isAlreadyActive) {
        return;
    }

    // Otherwise, activate the clicked button and show its section
    button.classList.add('active');
    
    if (mode === 'QR') {
        if (qrSection) qrSection.classList.remove('hidden');
        
        const qrPlaceholder = document.getElementById('qrPlaceholder');
        const qrImg = document.getElementById('qrImg');
        const startBtn = document.getElementById('startQrBtn');
        const activeQrControls = document.getElementById('activeQrControls');
        const qrTimerContainer = document.getElementById('qrTimerContainer');
        const qrCountdown = document.getElementById('qrCountdown');
        const qrMsg = document.getElementById('qrMsg');
        
        if (qrPlaceholder) {
            qrPlaceholder.innerHTML = `
                <i class="fas fa-qrcode fa-4x mb-3 text-primary" style="opacity: 0.3;"></i>
                <h5>QR Code Mode Ready</h5>
                <p class="px-4 text-center">Generate a dynamic QR code that students can scan to mark their attendance instantly.</p>
                <div id="qrTimerContainer" class="mt-2 hidden">
                    <div class="qr-timer shadow-sm border-0 mx-auto" style="width: fit-content;">
                        <i class="fas fa-clock"></i>
                        <span class="timer-num" id="qrCountdown">--</span>
                        <span class="text-muted small fw-bold">SEC</span>
                    </div>
                </div>
            `;
            qrPlaceholder.classList.remove('hidden');
        }
        
        if (qrImg) qrImg.classList.add('hidden');
        if (startBtn) {
            startBtn.classList.remove('hidden');
            startBtn.disabled = false;
            startBtn.innerHTML = '<i class="fas fa-play me-2"></i> Start QR Code';
        }
        if (activeQrControls) activeQrControls.classList.add('hidden');
        if (qrTimerContainer) qrTimerContainer.classList.add('hidden');
        if (qrCountdown) qrCountdown.textContent = '--';
        
        if (qrMsg) {
            qrMsg.innerHTML = '<i class="fas fa-info-circle"></i> QR mode selected. Click "Start QR Code" to begin.';
            qrMsg.style.color = '#2980b9';
        }
        
        isQRCodeActive = false;
        
        if (qrRefreshInterval) clearInterval(qrRefreshInterval);
        if (countdownInterval) clearInterval(countdownInterval);
        qrRefreshInterval = null;
        countdownInterval = null;
        
    } else if (mode === 'Face') {
        if (faceSection) faceSection.classList.remove('hidden');
        
        const startBtn = document.getElementById('startFaceBtn');
        const stopBtn = document.getElementById('stopFaceBtn');
        const faceMsg = document.getElementById('faceMsg');
        
        if (startBtn) startBtn.classList.remove('hidden');
        if (stopBtn) stopBtn.classList.add('hidden');
        
        if (faceMsg) {
            faceMsg.innerHTML = '<i class="fas fa-camera"></i> Face mode selected. Click "Activate Face Mode" to begin.';
            faceMsg.style.color = '#2980b9';
        }
    } else if (mode === 'Manual') {
        if (manualSection) manualSection.classList.remove('hidden');
        loadManualRoster();
    }
}

// Placeholder hook for future face recognition camera usage.
function stopFaceRecognition() {
    const video = document.getElementById('faceVideo');
    const stream = video?.srcObject;
    if (stream && typeof stream.getTracks === 'function') {
        stream.getTracks().forEach(t => t.stop());
    }
    if (video) video.srcObject = null;
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
        const response = await fetch(`${API_BASE_URL}/generate_qr`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: currentSessionId })
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            isQRCodeActive = true;
            
            if (qrPlaceholder) qrPlaceholder.classList.add('hidden');
            if (qrImg) {
                qrImg.classList.remove('hidden');
                qrImg.src = 'data:image/png;base64,' + data.qr_code;
            }
            
            startBtn.classList.add('hidden');
            if (stopBtn) stopBtn.classList.remove('hidden');
            if (refreshBtn) refreshBtn.classList.remove('hidden');
            
            startCountdown(data.expires_in || 15);
            
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

async function deactivateQRMode() {
    const result = await Swal.fire({
        title: 'Stop QR Code?',
        text: 'Students will no longer be able to scan.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#e74c3c',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Yes, stop it!'
    });

    if (!result.isConfirmed) return;

    try {
        const response = await fetch(`${API_BASE_URL}/stop_qr`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: currentSessionId })
        });

        const data = await response.json();
        if (data.status !== 'success') {
            alert(data.message || 'Unable to stop QR');
            return;
        }

        isQRCodeActive = false;

        if (qrRefreshInterval) clearInterval(qrRefreshInterval);
        if (countdownInterval) clearInterval(countdownInterval);
        qrRefreshInterval = null;
        countdownInterval = null;

        const qrPlaceholder = document.getElementById('qrPlaceholder');
        const qrImg = document.getElementById('qrImg');
        const startBtn = document.getElementById('startQrBtn');
        const stopBtn = document.getElementById('stopQrBtn');
        const refreshBtn = document.getElementById('refreshQrBtn');
        const qrCountdown = document.getElementById('qrCountdown');
        const qrMsg = document.getElementById('qrMsg');

        if (qrPlaceholder) {
            qrPlaceholder.innerHTML = `
                <i class="fas fa-qrcode fa-4x mb-3" style="color: #2980b9; opacity: 0.3;"></i>
                <p class="fw-bold mb-1">Ready to Start</p>
                <small>Generate a secure QR code for students</small>
            `;
            qrPlaceholder.classList.remove('hidden');
        }

        if (qrImg) qrImg.classList.add('hidden');
        if (startBtn) startBtn.classList.remove('hidden');
        if (stopBtn) stopBtn.classList.add('hidden');
        if (refreshBtn) refreshBtn.classList.add('hidden');
        if (qrCountdown) qrCountdown.textContent = '--';

        if (startBtn) {
            startBtn.disabled = false;
            startBtn.innerHTML = '<i class="fas fa-play"></i> Start QR';
        }

        if (qrMsg) {
            qrMsg.innerHTML = '<i class="fas fa-info-circle"></i> QR code stopped. Click "Start QR" to activate again.';
            qrMsg.style.color = '#3498db';
        }
    } catch (err) {
        console.error('Error stopping QR:', err);
        alert('Error stopping QR code');
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
        const response = await fetch(`${API_BASE_URL}/refresh_qr`, {
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
            
            const qrMsg = document.getElementById('qrMsg');
            if (qrMsg) {
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
// FACE RECOGNITION MODE (PHASE 2)
// ============================================

async function activateFaceMode() {
    if (!currentSessionId) {
        alert('Please start a session first');
        return;
    }

    const startBtn = document.getElementById('startFaceBtn');
    const stopBtn = document.getElementById('stopFaceBtn');
    const faceMsg = document.getElementById('faceMsg');

    try {
        const response = await apiCall('/update_session_mode', {
            method: 'POST',
            body: JSON.stringify({ 
                session_id: currentSessionId,
                mode: 'Face'
            })
        });

        const data = await response.json();

        if (data.status === 'success') {
            if (startBtn) startBtn.classList.add('hidden');
            if (stopBtn) stopBtn.classList.remove('hidden');
            if (faceMsg) {
                faceMsg.innerHTML = '<i class="fas fa-check-circle"></i> Face Recognition Active! Share Session ID with students.';
                faceMsg.style.color = '#27ae60';
            }
            showTeacherToast('Face Recognition Mode Activated', 'success');
        } else {
            alert('Failed to activate Face Mode');
        }
    } catch (err) {
        console.error('Error activating Face Mode:', err);
        alert('Error communicating with server');
    }
}

async function deactivateFaceMode() {
    const startBtn = document.getElementById('startFaceBtn');
    const stopBtn = document.getElementById('stopFaceBtn');
    const faceMsg = document.getElementById('faceMsg');

    try {
        const response = await apiCall('/update_session_mode', {
            method: 'POST',
            body: JSON.stringify({ 
                session_id: currentSessionId,
                mode: 'Hybrid' // Default mode
            })
        });

        if (startBtn) startBtn.classList.remove('hidden');
        if (stopBtn) stopBtn.classList.add('hidden');
        if (faceMsg) {
            faceMsg.innerHTML = '<i class="fas fa-info-circle"></i> Face Mode Deactivated.';
            faceMsg.style.color = '#2980b9';
        }
    } catch (err) {
        console.error('Error deactivating Face Mode:', err);
    }
}

// ============================================
// LOAD ATTENDANCE LIST
// ============================================

async function loadAttendanceList() {
    if (!currentSessionId) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/attendance_list?session_id=${currentSessionId}`, {
            credentials: 'include'
        });
        const data = await response.json();
        
        if (data.status === 'success') {
            const tbody = document.getElementById('attendanceTableBody');
            if (!tbody) return;
            
            tbody.innerHTML = '';
            
            let presentCount = 0;
            let serialNo = 1;
            const currentPresentStudentIds = new Set();
            const newlyMarkedNames = [];
            
            data.attendance.forEach(record => {
                const row = tbody.insertRow();
                const statusText =
                    record.status === 'present' ? 'Present' :
                    record.status === 'not_marked' ? 'Not Marked' :
                    'Absent';
                const statusClass =
                    record.status === 'present' ? 'status-present' :
                    record.status === 'not_marked' ? 'status-pending' :
                    'status-absent';

                const timeText = formatPkTime(record.marked_at);
                const modeText = methodLabel(record.mode);
                
                row.innerHTML = `
                    <td style="width: 50px;">${serialNo++}</td>
                    <td><strong>${record.student_name}</strong></td>
                    <td>${record.registration_no || '-'}</td>
                    <td>${timeText}</td>
                    <td>${modeText}</td>
                    <td><span class="${statusClass}">${statusText}</span></td>
                `;
                if (record.status === 'present') {
                    presentCount++;
                    currentPresentStudentIds.add(record.user_id);
                    if (!previousPresentStudentIds.has(record.user_id)) {
                        newlyMarkedNames.push(record.student_name);
                    }
                }
            });
            
            const presentCountSpan = document.getElementById('presentCount');
            const totalStudentsSpan = document.getElementById('totalStudents');
            
            if (presentCountSpan) presentCountSpan.textContent = presentCount;
            if (totalStudentsSpan) totalStudentsSpan.textContent = data.attendance.length;

            if (previousPresentStudentIds.size > 0 && newlyMarkedNames.length > 0) {
                const joinedNames = newlyMarkedNames.slice(0, 2).join(', ');
                const suffix = newlyMarkedNames.length > 2 ? ` +${newlyMarkedNames.length - 2} more` : '';
                
                const Toast = Swal.mixin({
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 3000,
                    timerProgressBar: true,
                    background: '#0f172a',
                    color: '#ffffff',
                    iconColor: '#10b981'
                });
                Toast.fire({
                    icon: 'success',
                    title: 'Attendance Marked',
                    text: `${joinedNames}${suffix}`
                });
            }
            previousPresentStudentIds = currentPresentStudentIds;

            // Keep manual roster in sync if visible.
            const manualSection = document.getElementById('manualSection');
            if (manualSection && !manualSection.classList.contains('hidden')) {
                manualRosterCache = data.attendance || [];
                renderManualRoster();
            }
        }
    } catch (err) {
        console.error('Error loading attendance:', err);
    }
}

// ============================================
// MANUAL ENTRY (TEACHER MARKING)
// ============================================

async function loadManualRoster() {
    if (!currentSessionId) {
        renderManualRosterPlaceholder('Start a session to use manual entry');
        return;
    }
    try {
        const response = await apiCall(`/attendance_list?session_id=${currentSessionId}`);
        if (!response) return;
        const data = await response.json();
        if (data.status !== 'success') {
            renderManualRosterPlaceholder('Unable to load students');
            return;
        }
        manualRosterCache = data.attendance || [];
        renderManualRoster();
    } catch (err) {
        console.error('Error loading manual roster:', err);
        renderManualRosterPlaceholder('Unable to load students');
    }
}

function renderManualRosterPlaceholder(text) {
    const tbody = document.getElementById('manualTableBody');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="6" class="text-center">${text}</td></tr>`;
}

function getManualSearchTerm() {
    return (document.getElementById('manualSearch')?.value || '').trim().toLowerCase();
}

function renderManualRoster() {
    const tbody = document.getElementById('manualTableBody');
    if (!tbody) return;

    const term = getManualSearchTerm();
    const filtered = manualRosterCache.filter(r => {
        if (!term) return true;
        const name = (r.student_name || '').toLowerCase();
        const roll = (r.registration_no || '').toLowerCase();
        return name.includes(term) || roll.includes(term);
    });

    tbody.innerHTML = '';
    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center">No students match your search</td></tr>`;
        return;
    }

    filtered.forEach(r => {
        const statusText =
            r.status === 'present' ? 'Present' :
            r.status === 'not_marked' ? 'Not Marked' :
            'Absent';
        const statusClass =
            r.status === 'present' ? 'status-present' :
            r.status === 'not_marked' ? 'status-pending' :
            'status-absent';
        const timeText = r.marked_at ? formatPkTime(r.marked_at) : '--:--';
        const modeText = methodLabel(r.mode);
        const row = document.createElement('tr');
        const checkedAttr = selectedManualStudentIds.has(Number(r.user_id)) ? 'checked' : '';
        row.innerHTML = `
            <td><input type="checkbox" class="manual-row-check" data-student-id="${r.user_id}" ${checkedAttr}></td>
            <td><strong>${r.student_name}</strong></td>
            <td>${r.registration_no || '-'}</td>
            <td><span class="${statusClass}">${statusText}</span></td>
            <td>${timeText}</td>
            <td>${modeText}</td>
        `;
        tbody.appendChild(row);
    });
    syncManualSelectAllCheckbox();
}

function filterManualRoster() {
    renderManualRoster();
}

function toggleSelectAllManual(checked) {
    const checks = document.querySelectorAll('#manualTableBody .manual-row-check');
    checks.forEach(c => {
        c.checked = checked;
        const id = Number(c.getAttribute('data-student-id'));
        if (!Number.isFinite(id)) return;
        if (checked) selectedManualStudentIds.add(id);
        else selectedManualStudentIds.delete(id);
    });
    syncManualSelectAllCheckbox();
}

function getSelectedManualStudentIds() {
    return Array.from(selectedManualStudentIds.values());
}

async function markSelectedAttendance(status) {
    if (!currentSessionId) {
        Swal.fire('Error', 'Please start a session first', 'error');
        return;
    }
    const selectedIds = getSelectedManualStudentIds();
    if (selectedIds.length === 0) {
        Swal.fire({
            icon: 'info',
            title: 'No Students Selected',
            text: 'Please select at least one student from the list.'
        });
        return;
    }

    const result = await Swal.fire({
        title: `Mark as ${status}?`,
        text: `You are about to mark ${selectedIds.length} student(s) as ${status}.`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: status === 'Present' ? '#27ae60' : '#e67e22',
        confirmButtonText: 'Yes, proceed'
    });

    if (!result.isConfirmed) return;

    try {
        const response = await apiCall('/teacher_mark_attendance', {
            method: 'POST',
            body: JSON.stringify({
                session_id: currentSessionId,
                student_ids: selectedIds,
                status
            })
        });
        if (!response) return;
        const data = await response.json();
        if (data.status !== 'success') {
            Swal.fire('Error', data.message || 'Unable to update attendance', 'error');
            return;
        }
        
        Swal.fire({
            icon: 'success',
            title: 'Success!',
            text: `Updated ${selectedIds.length} student(s) to ${status}.`,
            timer: 2000,
            showConfirmButton: false
        });
        
        selectedManualStudentIds.clear();
        const selAll = document.getElementById('manualSelectAll');
        if (selAll) selAll.checked = false;
        await loadAttendanceList();
        await loadManualRoster();
    } catch (err) {
        console.error('Teacher mark attendance error:', err);
        alert('Unable to update attendance');
    }
}

async function downloadSessionSheet(format = 'excel') {
    if (!currentSessionId) {
        Swal.fire('Error', 'Start a session first', 'error');
        return;
    }
    
    // Show loading state
    const loadingToast = Swal.fire({
        title: 'Generating Report...',
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });

    try {
        const response = await fetch(`${API_BASE_URL}/teacher_session_report?session_id=${currentSessionId}&format=${format}`, {
            method: 'GET',
            credentials: 'include'
        });
        
        Swal.close(); // Close loading

        if (!response.ok) {
            const err = await response.json().catch(() => null);
            Swal.fire('Error', err?.message || 'Unable to download sheet', 'error');
            return;
        }
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const disposition = response.headers.get('content-disposition') || '';
        const match = disposition.match(/filename="?([^"]+)"?/i);
        
        const ext = format === 'pdf' ? 'pdf' : 'xlsx';
        a.download = match?.[1] || `attendance_session_${currentSessionId}.${ext}`;
        
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);

        Swal.fire({
            icon: 'success',
            title: 'Downloaded!',
            text: `Attendance report (${format.toUpperCase()}) saved.`,
            timer: 2000,
            showConfirmButton: false
        });
    } catch (err) {
        console.error('Download sheet error:', err);
        Swal.fire('Error', 'Unable to download report', 'error');
    }
}

// ============================================
// CLOSE SESSION
// ============================================

async function closeSession() {
    const result = await Swal.fire({
        title: 'Close Session?',
        text: 'Are you sure you want to end this attendance session?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#e74c3c',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Yes, close it!'
    });

    if (!result.isConfirmed) return;
    
    try {
        await fetch(`${API_BASE_URL}/close_session`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: currentSessionId })
        });
        
        Swal.fire({
            icon: 'success',
            title: 'Session Closed',
            text: 'Attendance session has been ended successfully.',
            confirmButtonColor: '#2980b9'
        });

        currentSessionId = null;
        currentActiveSectionId = null;
        previousPresentStudentIds = new Set();
        updateActiveSessionIdDisplay();
        isQRCodeActive = false;
        
        if (refreshInterval) clearInterval(refreshInterval);
        if (qrRefreshInterval) clearInterval(qrRefreshInterval);
        if (countdownInterval) clearInterval(countdownInterval);
        refreshInterval = null;
        qrRefreshInterval = null;
        countdownInterval = null;
        
        const activeSession = document.getElementById('activeSession');
        const modeSelector = document.getElementById('modeSelector');
        const qrSection = document.getElementById('qrSection');
        const faceSection = document.getElementById('faceSection');
        const manualSection = document.getElementById('manualSection');
        const attendanceList = document.getElementById('attendanceList');
        
        if (activeSession) activeSession.classList.add('hidden');
        if (modeSelector) modeSelector.classList.add('hidden');
        if (qrSection) qrSection.classList.add('hidden');
        if (faceSection) faceSection.classList.add('hidden');
        if (manualSection) manualSection.classList.add('hidden');
        if (attendanceList) attendanceList.classList.add('hidden');

        stopFaceRecognition();
        manualRosterCache = [];
        selectedManualStudentIds.clear();
        renderManualRosterPlaceholder('Start a session to use manual entry');
        
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
        
        document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
        
        loadCourses();
    } catch (err) {
        console.error('Error closing session:', err);
    }
}

// ============================================
// LOGOUT
// ============================================

async function logout() {
    try {
        await fetch(`${API_BASE_URL}/logout`, {
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

// Persist manual checkbox selections across auto-refresh re-renders.
document.addEventListener('change', (e) => {
    const el = e.target;
    if (!(el instanceof HTMLInputElement)) return;
    if (!el.classList.contains('manual-row-check')) return;
    const id = Number(el.getAttribute('data-student-id'));
    if (!Number.isFinite(id)) return;
    if (el.checked) selectedManualStudentIds.add(id);
    else selectedManualStudentIds.delete(id);
    syncManualSelectAllCheckbox();
});

loadCourses();