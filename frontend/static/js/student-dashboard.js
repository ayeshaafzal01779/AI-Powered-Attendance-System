// ============================================
// STUDENT DASHBOARD - COMPLETE UPDATED CODE
// ============================================

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

// Display student name
document.getElementById('userName').textContent = user.name;

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
// LOAD STUDENT ATTENDANCE DATA
// ============================================

async function loadAttendance() {
    try {
        const response = await apiCall('http://127.0.0.1:5000/my_attendance');
        if (!response) return;
        
        const data = await response.json();
        
        if (data.status === 'success' && data.attendance && data.attendance.length > 0) {
            // Calculate overall attendance
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
                
                // Add to chart data
                chartLabels.push(course.course_code);
                chartData.push(percentage);
                
                // Set color based on percentage
                let colorClass = 'percentage-low';
                if (percentage >= 75) colorClass = 'percentage-high';
                else if (percentage >= 50) colorClass = 'percentage-medium';
                
                // Add to course list
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
            
            // Update overall attendance
            const overallAvg = data.attendance.length > 0 ? (totalPercentage / data.attendance.length).toFixed(1) : 0;
            const overallElement = document.getElementById('overallAttendance');
            const classesAttendedElement = document.getElementById('classesAttended');
            const monthAttendanceElement = document.getElementById('monthAttendance');
            
            if (overallElement) overallElement.textContent = overallAvg + '%';
            if (classesAttendedElement) classesAttendedElement.textContent = `${totalPresent} / ${totalClasses}`;
            
            // Calculate this month attendance (using first course as sample)
            if (data.attendance.length > 0 && monthAttendanceElement) {
                monthAttendanceElement.textContent = data.attendance[0].percentage + '%';
            }
            
            // Update chart
            updateChart(chartLabels, chartData);
            
            // Check for low attendance alert
            const lowCourses = data.attendance.filter(c => parseFloat(c.percentage) < 75);
            if (lowCourses.length > 0) {
                const alertBox = document.getElementById('alertBox');
                const alertMessage = document.getElementById('alertMessage');
                if (alertBox && alertMessage) {
                    alertMessage.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ⚠️ Your attendance is below 75% in: ${lowCourses.map(c => c.course_code).join(', ')}`;
                    alertBox.classList.remove('hidden');
                }
            } else {
                const alertBox = document.getElementById('alertBox');
                if (alertBox) alertBox.classList.add('hidden');
            }
        } else {
            const courseList = document.getElementById('courseAttendanceList');
            if (courseList) {
                courseList.innerHTML = '<div class="loading-spinner">No attendance records found. Please contact your teacher.</div>';
            }
        }
    } catch (err) {
        console.error('Error loading attendance:', err);
        const courseList = document.getElementById('courseAttendanceList');
        if (courseList) {
            courseList.innerHTML = '<div class="loading-spinner">Error loading attendance data. Please refresh.</div>';
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
                    title: {
                        display: true,
                        text: 'Percentage (%)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Courses'
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `Attendance: ${context.raw}%`;
                        }
                    }
                }
            }
        }
    });
}

// ============================================
// MARK ATTENDANCE VIA QR
// ============================================

async function markQR() {
    const sessionId = prompt('📱 Enter Session ID (provided by teacher):');
    if (!sessionId) return;
    
    try {
        const response = await fetch('http://127.0.0.1:5000/mark_attendance', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                session_id: parseInt(sessionId),
                mode: 'QR'
            })
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            alert('Attendance marked successfully via QR Code!');
            loadAttendance(); // Refresh data
        } else {
            alert('' + (data.message || 'Failed to mark attendance'));
        }
    } catch (err) {
        console.error('Error marking attendance:', err);
        alert('Error connecting to server. Make sure backend is running.');
    }
}

// ============================================
// MARK ATTENDANCE VIA FACE
// ============================================

async function markFace() {
    const sessionId = prompt('📸 Enter Session ID (provided by teacher):');
    if (!sessionId) return;
    
    // For face recognition, you'll need to implement camera capture
    // This is a simplified version - will be enhanced later
    alert('📸 Face Recognition: Please position your face in front of camera');
    
    try {
        const response = await fetch('http://127.0.0.1:5000/mark_attendance', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                session_id: parseInt(sessionId),
                mode: 'Face'
            })
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            alert('Face verified! Attendance marked successfully!');
            loadAttendance(); // Refresh data
        } else {
            alert('' + (data.message || 'Face verification failed'));
        }
    } catch (err) {
        console.error('Error marking attendance:', err);
        alert('Error connecting to server.');
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

loadAttendance();