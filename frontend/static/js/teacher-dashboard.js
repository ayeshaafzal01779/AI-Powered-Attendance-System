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
    alert('Access Denied. Teachers only.');
    window.location.href = '/';
}

// Global variables
let currentSessionId = null;
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
    let toast = document.getElementById('teacherToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'teacherToast';
        toast.className = 'teacher-toast';
        document.body.appendChild(toast);
    }

    if (teacherToastTimer) clearTimeout(teacherToastTimer);
    toast.textContent = text;
    toast.className = `teacher-toast show ${type}`;
    teacherToastTimer = setTimeout(() => {
        toast.className = 'teacher-toast';
    }, 4500);
}

function updateActiveSessionIdDisplay() {
    const sessionIdEl = document.getElementById('activeSessionId');
    if (sessionIdEl) {
        sessionIdEl.textContent = currentSessionId || '--';
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
        const response = await apiCall('/teacher_courses');
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
        const response = await fetch(`${API_BASE_URL}/start_session`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ section_id: sectionId })
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            currentSessionId = data.session_id;
            updateActiveSessionIdDisplay();
            
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
        alert('Error starting session');
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
    document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
    
    const qrSection = document.getElementById('qrSection');
    const faceSection = document.getElementById('faceSection');
    const manualSection = document.getElementById('manualSection');
    
    if (qrSection) qrSection.classList.add('hidden');
    if (faceSection) faceSection.classList.add('hidden');
    if (manualSection) manualSection.classList.add('hidden');

    // Face feature is "coming soon", but keep this safe when toggling modes.
    stopFaceRecognition();
    
    if (mode === 'QR') {
        if (qrSection) qrSection.classList.remove('hidden');
        
        const qrPlaceholder = document.getElementById('qrPlaceholder');
        const qrImg = document.getElementById('qrImg');
        const startBtn = document.getElementById('startQrBtn');
        const stopBtn = document.getElementById('stopQrBtn');
        const refreshBtn = document.getElementById('refreshQrBtn');
        const qrCountdown = document.getElementById('qrCountdown');
        const qrMsg = document.getElementById('qrMsg');
        
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
        
        if (qrMsg) {
            qrMsg.innerHTML = '<i class="fas fa-qrcode"></i> QR mode selected. Click "Start QR" to begin.';
            qrMsg.style.color = '#2980b9';
        }
        
        isQRCodeActive = false;
        
        if (qrRefreshInterval) clearInterval(qrRefreshInterval);
        if (countdownInterval) clearInterval(countdownInterval);
        qrRefreshInterval = null;
        countdownInterval = null;
        
    } else if (mode === 'Face') {
        // Face Recognition is intentionally disabled in UI (coming soon).
        if (faceSection) faceSection.classList.remove('hidden');
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
    if (!confirm('Stop QR code? Students will no longer be able to scan.')) return;

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
                showTeacherToast(`Attendance marked: ${joinedNames}${suffix}`, 'success');
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
        alert('Please start a session first');
        return;
    }
    const selectedIds = getSelectedManualStudentIds();
    if (selectedIds.length === 0) {
        alert('Select at least one student');
        return;
    }

    const confirmText = status === 'Absent'
        ? `Mark ${selectedIds.length} selected student(s) Absent?`
        : `Mark ${selectedIds.length} selected student(s) Present?`;
    if (!confirm(confirmText)) return;

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
            alert(data.message || 'Unable to update attendance');
            return;
        }
        showTeacherToast(`Updated ${selectedIds.length} student(s)`, 'success');
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

async function downloadSessionSheet() {
    if (!currentSessionId) {
        alert('Start a session first');
        return;
    }
    try {
        const response = await fetch(`${API_BASE_URL}/teacher_session_report?session_id=${currentSessionId}&format=excel`, {
            method: 'GET',
            credentials: 'include'
        });
        if (!response.ok) {
            const err = await response.json().catch(() => null);
            alert(err?.message || 'Unable to download sheet');
            return;
        }
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const disposition = response.headers.get('content-disposition') || '';
        const match = disposition.match(/filename="?([^"]+)"?/i);
        a.download = match?.[1] || `attendance_session_${currentSessionId}.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
    } catch (err) {
        console.error('Download sheet error:', err);
        alert('Unable to download sheet');
    }
}

// ============================================
// CLOSE SESSION
// ============================================

async function closeSession() {
    if (!confirm('Are you sure you want to close this session?')) return;
    
    try {
        await fetch(`${API_BASE_URL}/close_session`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: currentSessionId })
        });
        
        currentSessionId = null;
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