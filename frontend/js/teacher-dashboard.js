// Get teacher ID from URL
const urlParams = new URLSearchParams(window.location.search);
const teacher_id = urlParams.get('user_id');

let currentSessionId = null;
let refreshTimer = null;
let countdown = 12;
let currentMode = 'QR';
let attendanceData = [];

// Course mapping - This should come from your backend
const courses = {
'CS101': { id: 101, name: 'Intro to Programming', total: 52 },
'CS201': { id: 201, name: 'Data Structures', total: 48 },
'CS301': { id: 301, name: 'Database Systems', total: 45 }
};

// Sample attendance data (in real app, this comes from backend)
const sampleAttendanceData = {
'CS101': [
    { id: 1, name: 'John Doe', time: '09:02 AM', mode: 'QR', status: 'present' },
    { id: 2, name: 'Jane Smith', time: '09:03 AM', mode: 'Face', status: 'present' },
    { id: 3, name: 'Mike Johnson', time: '09:05 AM', mode: 'QR', status: 'present' },
    { id: 4, name: 'Sarah Williams', time: '', mode: '', status: 'absent' },
    { id: 5, name: 'Robert Brown', time: '09:07 AM', mode: 'QR', status: 'present' },
    { id: 6, name: 'Emily Davis', time: '09:08 AM', mode: 'Face', status: 'present' },
    { id: 7, name: 'Michael Wilson', time: '', mode: '', status: 'absent' }
],
'CS201': [
    { id: 1, name: 'Alice Johnson', time: '10:05 AM', mode: 'QR', status: 'present' },
    { id: 2, name: 'Bob Miller', time: '', mode: '', status: 'absent' },
    { id: 3, name: 'Charlie Brown', time: '10:07 AM', mode: 'QR', status: 'present' }
],
'CS301': [
    { id: 1, name: 'David Wilson', time: '11:10 AM', mode: 'Face', status: 'present' },
    { id: 2, name: 'Eva Green', time: '11:12 AM', mode: 'QR', status: 'present' }
]
};

// Function to select a course
function selectCourse(courseCode, event) {
if (event) event.stopPropagation();

// Update active course in sidebar
document.querySelectorAll('.course-card').forEach(card => {
    card.classList.remove('active');
});

// Find the clicked card and make it active
const cards = document.querySelectorAll('.course-card');
cards.forEach(card => {
    if (card.querySelector('.course-code').textContent === courseCode) {
        card.classList.add('active');
    }
});
}

// Function to set attendance mode
function setMode(mode, button) {
currentMode = mode;

// Update active button
const modeButtons = document.querySelectorAll('.mode-btn');
modeButtons.forEach(btn => btn.classList.remove('active'));
button.classList.add('active');

console.log(`Attendance mode set to: ${mode}`);
// In real app, you would send this to backend
}

// Function to extend session
function extendSession() {
const extendMinutes = prompt('Extend session by how many minutes?', '15');
if (extendMinutes && !isNaN(extendMinutes)) {
    alert(`Session extended by ${extendMinutes} minutes`);
    // In real app, send request to backend
}
}

// Function to start a session
async function startSession(courseCode, event) {
if (event) event.stopPropagation();

// Show loading state
const msg = document.getElementById('qrMsg');
msg.innerText = "Starting session...";

try {
    // Get course details
    const course = courses[courseCode];
    if (!course) {
        msg.innerText = "Course not found";
        return;
    }
    
    // Call backend to start session
    const res = await fetch('http://127.0.0.1:5000/start_session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            teacher_id: teacher_id || 1,  // Fallback if not in URL
            course_id: course.id 
        })
    });

    const data = await res.json();
    console.log("SESSION RESPONSE:", data);

    if(data.status === 'success') {
        currentSessionId = data.session_id;
        
        // Show session sections
        document.getElementById('activeSession').classList.remove('hidden');
        document.getElementById('qrSection').classList.remove('hidden');
        document.getElementById('attendanceList').classList.remove('hidden');
        
        // Update course info
        document.getElementById('activeCourseName').textContent = 
            `${courseCode} - ${course.name}`;
        
        // Update attendance count
        document.getElementById('totalStudents').textContent = course.total;
        
        // Update time
        const now = new Date();
        const startTime = formatTime(now);
        const endTime = formatTime(new Date(now.getTime() + 90 * 60000)); // 90 minutes later
        
        document.getElementById('startTime').textContent = startTime;
        document.getElementById('endTime').textContent = endTime;
        
        // Show QR code
        if (data.qr_code) {
            document.getElementById('qrPlaceholder').classList.add('hidden');
            document.getElementById('qrImg').classList.remove('hidden');
            document.getElementById('qrImg').src = 
                'data:image/png;base64,' + data.qr_code;
        } else {
            // Fallback QR code generation
            generateFallbackQR(courseCode, course.id);
        }
        
        msg.innerText = "Session started successfully!";
        
        // Load attendance data for this course
        attendanceData = sampleAttendanceData[courseCode] || [];
        loadAttendanceList();
        
        // Start refresh countdown
        startRefreshCountdown();
    } else {
        msg.innerText = data.message || "Failed to start session";
        // Fallback for demo if backend fails
        simulateSessionStart(courseCode, course);
    }
} catch (err) {
    console.error("Session start error:", err);
    msg.innerText = "Server error. Using demo mode...";
    // Fallback for demo
    const course = courses[courseCode];
    if (course) {
        simulateSessionStart(courseCode, course);
    }
}
}

// Fallback function for demo
function simulateSessionStart(courseCode, course) {
currentSessionId = Math.floor(Math.random() * 1000) + 1;

// Show session sections
document.getElementById('activeSession').classList.remove('hidden');
document.getElementById('qrSection').classList.remove('hidden');
document.getElementById('attendanceList').classList.remove('hidden');

// Update course info
document.getElementById('activeCourseName').textContent = 
    `${courseCode} - ${course.name}`;

// Update attendance count
document.getElementById('totalStudents').textContent = course.total;

// Update time
const now = new Date();
const startTime = formatTime(now);
const endTime = formatTime(new Date(now.getTime() + 90 * 60000));

document.getElementById('startTime').textContent = startTime;
document.getElementById('endTime').textContent = endTime;

// Generate demo QR code
generateFallbackQR(courseCode, course.id);

// Load attendance data
attendanceData = sampleAttendanceData[courseCode] || [];
loadAttendanceList();

// Start refresh countdown
startRefreshCountdown();

document.getElementById('qrMsg').innerText = "Demo session started";
}

// Generate fallback QR code
function generateFallbackQR(courseCode, courseId) {
document.getElementById('qrPlaceholder').classList.add('hidden');
document.getElementById('qrImg').classList.remove('hidden');

// Create a simple QR code URL (using a QR code API or placeholder)
const qrText = `SESSION:${courseId}_${Date.now()}`;
const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrText)}`;
document.getElementById('qrImg').src = qrUrl;
}

// Format time to HH:MM AM/PM
function formatTime(date) {
let hours = date.getHours();
let minutes = date.getMinutes();
const ampm = hours >= 12 ? 'PM' : 'AM';
hours = hours % 12;
hours = hours ? hours : 12;
minutes = minutes < 10 ? '0' + minutes : minutes;
return `${hours}:${minutes} ${ampm}`;
}

// Start refresh countdown
function startRefreshCountdown() {
countdown = 12;
updateCountdown();

if (refreshTimer) clearInterval(refreshTimer);

refreshTimer = setInterval(() => {
    countdown--;
    updateCountdown();
    
    if (countdown <= 0) {
        // Refresh attendance data
        refreshAttendanceData();
        countdown = 12;
    }
}, 1000);
}

// Update countdown display
function updateCountdown() {
const countdownElement = document.getElementById('countdown');
if (countdownElement) {
    countdownElement.textContent = countdown;
}
}

// Refresh attendance data (simulated)
function refreshAttendanceData() {
console.log("Refreshing attendance data...");
// In real app, fetch from backend
loadAttendanceList();
}

// Load attendance list
function loadAttendanceList() {
const tableBody = document.getElementById('attendanceTableBody');
if (!tableBody) return;

tableBody.innerHTML = '';

let presentCount = 0;

attendanceData.forEach(student => {
    const row = document.createElement('tr');
    
    row.innerHTML = `
        <td>${student.name}</td>
        <td>${student.time || ''}</td>
        <td class="attendance-mode">${student.mode || ''}</td>
        <td>
            <span class="attendance-status ${student.status === 'present' ? 'status-present' : 'status-absent'}">
                ${student.status === 'present' ? 'Present' : 'Absent'}
            </span>
        </td>
    `;
    
    tableBody.appendChild(row);
    
    if (student.status === 'present') {
        presentCount++;
    }
});

// Update present count
const presentCountElement = document.getElementById('presentCount');
if (presentCountElement) {
    presentCountElement.textContent = presentCount;
}
}

// Close session
function closeSession() {
if (confirm("Are you sure you want to close this session?")) {
    // Hide session sections
    document.getElementById('activeSession').classList.add('hidden');
    document.getElementById('qrSection').classList.add('hidden');
    document.getElementById('attendanceList').classList.add('hidden');
    
    // Reset QR code
    document.getElementById('qrPlaceholder').classList.remove('hidden');
    document.getElementById('qrImg').classList.add('hidden');
    document.getElementById('qrImg').src = '';
    
    // Clear timer
    if (refreshTimer) {
        clearInterval(refreshTimer);
        refreshTimer = null;
    }
    
    // Reset message
    document.getElementById('qrMsg').innerText = '';
    
    alert("Session closed successfully!");
}
}

// Logout function
function logout() {
if (confirm("Are you sure you want to logout?")) {
    window.location.href = 'index.html';
}
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
// If teacher_id is in URL, you might want to fetch teacher name
if (teacher_id) {
    // In real app, fetch teacher details from backend
    // For now, keep default
}

// Initialize any default data
console.log("Teacher Dashboard Loaded");
});