// ============================================
// STUDENT DASHBOARD - WITH DYNAMIC URL (FIXED)
// ============================================

// Get base URL dynamically (works on any device)
const API_BASE_URL = 'http://' + window.location.hostname + ':5000';

// Get user from localStorage
const user = JSON.parse(localStorage.getItem('user'));
const userId = localStorage.getItem('userId');
const userRole = localStorage.getItem('userRole');

// Role check
if (!user || !userId || userRole !== 'Student') {
    alert('Access Denied. Students only.');
    window.location.href = '/';
}

// Global variables
let attendanceChart = null;
let html5QrCode = null;
let isScanning = false;

// Display student name
document.getElementById('userName').textContent = user.name;

// ============================================
// API CALL FUNCTION WITH DYNAMIC URL
// ============================================

async function apiCall(url, options = {}) {
    // If URL is relative, use API_BASE_URL
    const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
    
    const defaultOptions = {
        method: 'GET',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json'
        }
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
// SHOW MESSAGE
// ============================================

function showMessage(text, type) {
    let msgDiv = document.getElementById('message');
    
    // Create message div if not exists
    if (!msgDiv) {
        msgDiv = document.createElement('div');
        msgDiv.id = 'message';
        msgDiv.className = 'message';
        const scanSection = document.querySelector('.scan-section');
        if (scanSection) {
            scanSection.appendChild(msgDiv);
        } else {
            const container = document.querySelector('.container');
            if (container) container.insertBefore(msgDiv, container.firstChild);
        }
    }
    
    msgDiv.textContent = text;
    msgDiv.className = `message ${type}`;
    
    setTimeout(() => {
        msgDiv.className = 'message';
        msgDiv.textContent = '';
    }, 3000);
}

// ============================================
// LOAD STUDENT ATTENDANCE DATA
// ============================================

async function loadAttendance() {
    try {
        const response = await apiCall('/my_attendance');
        if (!response) return;
        
        const data = await response.json();
        
        if (data.status === 'success' && data.attendance && data.attendance.length > 0) {
            let totalPercentage = 0;
            let totalClasses = 0;
            let totalPresent = 0;
            
            const courseList = document.getElementById('courseAttendanceList');
            if (courseList) courseList.innerHTML = '';
            
            const chartLabels = [];
            const chartData = [];
            
            data.attendance.forEach(course => {
                const percentage = parseFloat(course.percentage) || 0;
                totalPercentage += percentage;
                
                chartLabels.push(course.course_code);
                chartData.push(percentage);
                
                let colorClass = 'percentage-low';
                if (percentage >= 75) colorClass = 'percentage-high';
                else if (percentage >= 50) colorClass = 'percentage-medium';
                
                if (courseList) {
                    const courseDiv = document.createElement('div');
                    courseDiv.className = 'course-item';
                    courseDiv.innerHTML = `
                        <span class="course-name">${course.course_code} - ${course.course_name}</span>
                        <span class="course-percentage ${colorClass}">${percentage}%</span>
                    `;
                    courseList.appendChild(courseDiv);
                }
                
                totalClasses += parseInt(course.total_sessions) || 0;
                totalPresent += parseInt(course.present_days) || 0;
            });
            
            const overallAvg = data.attendance.length > 0 ? (totalPercentage / data.attendance.length).toFixed(1) : 0;
            const overallElement = document.getElementById('overallAttendance');
            const classesAttendedElement = document.getElementById('classesAttended');
            const monthAttendanceElement = document.getElementById('monthAttendance');
            
            if (overallElement) overallElement.textContent = overallAvg + '%';
            if (classesAttendedElement) classesAttendedElement.textContent = `${totalPresent} / ${totalClasses}`;
            
            if (data.attendance.length > 0 && monthAttendanceElement) {
                monthAttendanceElement.textContent = data.attendance[0].percentage + '%';
            }
            
            updateChart(chartLabels, chartData);
            
            const lowCourses = data.attendance.filter(c => parseFloat(c.percentage) < 75);
            if (lowCourses.length > 0) {
                const alertBox = document.getElementById('alertBox');
                const alertMessage = document.getElementById('alertMessage');
                if (alertBox && alertMessage) {
                    alertMessage.innerHTML = `⚠️ Your attendance is below 75% in: ${lowCourses.map(c => c.course_code).join(', ')}`;
                    alertBox.classList.remove('hidden');
                }
            } else {
                const alertBox = document.getElementById('alertBox');
                if (alertBox) alertBox.classList.add('hidden');
            }
        } else {
            const courseList = document.getElementById('courseAttendanceList');
            if (courseList) {
                courseList.innerHTML = '<div class="loading-spinner">No attendance records found.</div>';
            }
        }
    } catch (err) {
        console.error('Error loading attendance:', err);
        const courseList = document.getElementById('courseAttendanceList');
        if (courseList) {
            courseList.innerHTML = '<div class="loading-spinner">Error loading attendance data.</div>';
        }
    }
}

// ============================================
// UPDATE CHART
// ============================================

function updateChart(labels, data) {
    const ctx = document.getElementById('attendanceChart');
    if (!ctx) return;
    
    if (attendanceChart) {
        attendanceChart.destroy();
    }
    
    attendanceChart = new Chart(ctx.getContext('2d'), {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Attendance Percentage',
                data: data,
                backgroundColor: 'rgba(52, 152, 219, 0.7)',
                borderColor: '#2980b9',
                borderWidth: 2,
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    title: { display: true, text: 'Percentage (%)' }
                },
                x: { title: { display: true, text: 'Courses' } }
            }
        }
    });
}

// ============================================
// OPEN QR SCANNER
// ============================================

function openQRScanner() {
    const modal = document.getElementById('qrModal');
    if (modal) modal.classList.remove('hidden');
    startQRScanner();
}

function closeQRScanner() {
    const modal = document.getElementById('qrModal');
    if (modal) modal.classList.add('hidden');
    stopQRScanner();
}

async function startQRScanner() {
    if (isScanning) return;
    
    const statusDiv = document.getElementById('qr-status');
    
    html5QrCode = new Html5Qrcode("qr-reader");
    
    const config = { fps: 10, qrbox: { width: 250, height: 250 } };
    
    try {
        isScanning = true;
        await html5QrCode.start({ facingMode: "environment" }, config, onQRSuccess, onQRFailure);
        if (statusDiv) {
            statusDiv.textContent = "Scanning... Position QR code in frame";
            statusDiv.style.color = "#27ae60";
        }
    } catch (err) {
        console.error("Unable to start scanning:", err);
        if (statusDiv) {
            statusDiv.textContent = "Camera access denied. Please allow camera permission.";
            statusDiv.style.color = "#e74c3c";
        }
        isScanning = false;
    }
}

function stopQRScanner() {
    if (html5QrCode && isScanning) {
        html5QrCode.stop().catch(err => console.error("Error stopping scanner:", err));
        html5QrCode = null;
        isScanning = false;
    }
}

// ============================================
// QR SCAN SUCCESS - MARK ATTENDANCE
// ============================================

async function onQRSuccess(decodedText) {
    stopQRScanner();
    closeQRScanner();
    
    console.log("QR Scanned:", decodedText);
    
    // Parse QR data: format "SESSION:{session_id}:{timestamp}:{random}"
    const parts = decodedText.split(':');
    
    if (parts.length < 2 || parts[0] !== 'SESSION') {
        showMessage('Invalid QR Code. Please scan teacher\'s QR code.', 'error');
        return;
    }
    
    const sessionId = parseInt(parts[1]);
    
    if (isNaN(sessionId)) {
        showMessage('Invalid Session ID in QR code.', 'error');
        return;
    }
    
    await markAttendance(sessionId, 'QR');
}

function onQRFailure(errorMessage) {
    const statusDiv = document.getElementById('qr-status');
    if (statusDiv && isScanning) {
        statusDiv.textContent = "Scanning... Position QR code in frame";
    }
}

// ============================================
// MARK ATTENDANCE - USING DYNAMIC URL
// ============================================

async function markAttendance(sessionId, mode) {
    showMessage('Processing attendance...', 'success');
    
    try {
        const response = await fetch(`${API_BASE_URL}/mark_attendance`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: sessionId, mode: mode })
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            showMessage('✅ Attendance marked successfully!', 'success');
            loadAttendance(); // Refresh dashboard data
        } else {
            showMessage('❌ ' + (data.message || 'Failed to mark attendance'), 'error');
        }
    } catch (err) {
        console.error('Error marking attendance:', err);
        showMessage('❌ Network error. Please try again.', 'error');
    }
}

// ============================================
// MARK QR (Manual Entry Fallback)
// ============================================

function markQR() {
    const sessionId = prompt('📱 Enter Session ID (provided by teacher):');
    if (!sessionId) return;
    markAttendance(parseInt(sessionId), 'QR');
}

// ============================================
// MARK FACE
// ============================================

function markFace() {
    const sessionId = prompt('📸 Enter Session ID (provided by teacher):');
    if (!sessionId) return;
    alert('📸 Face Recognition: Please position your face in front of camera');
    markAttendance(parseInt(sessionId), 'Face');
}

// ============================================
// LOGOUT - USING DYNAMIC URL
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

loadAttendance();