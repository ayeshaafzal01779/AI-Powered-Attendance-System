// ============================================
// ADMIN DASHBOARD - WITH DYNAMIC URL
// ============================================

const API_BASE_URL = 'http://' + window.location.hostname + ':5000';

// Get user from localStorage
const user = JSON.parse(localStorage.getItem('user'));
const userId = localStorage.getItem('userId');
const userRole = localStorage.getItem('userRole');

// Role check
if (!user || !userId || userRole !== 'Admin') {
    alert('Access Denied. Admin only.');
    window.location.href = '/';
}

// ============================================
// API CALL FUNCTION
// ============================================

async function apiCall(url, options = {}) {
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
// LOAD STATS
// ============================================

async function loadStats() {
    try {
        const response = await apiCall('/admin_stats');
        if (!response) return;
        
        const data = await response.json();
        
        if (data.status === 'success') {
            if (document.getElementById('totalStudents')) 
                document.getElementById('totalStudents').textContent = data.total_students || 0;
            if (document.getElementById('totalTeachers')) 
                document.getElementById('totalTeachers').textContent = data.total_teachers || 0;
            if (document.getElementById('totalCourses')) 
                document.getElementById('totalCourses').textContent = data.total_courses || 0;
            if (document.getElementById('totalSessions')) 
                document.getElementById('totalSessions').textContent = data.total_sessions || 0;
        }
    } catch (err) {
        console.error('Error loading stats:', err);
    }
}

// ============================================
// LOAD STUDENTS
// ============================================

async function loadStudents() {
    try {
        const response = await apiCall('/admin_students');
        if (!response) return;
        
        const data = await response.json();
        
        if (data.status === 'success') {
            const tbody = document.getElementById('studentsTableBody');
            if (!tbody) return;
            
            tbody.innerHTML = '';
            
            data.students.forEach(student => {
                const row = tbody.insertRow();
                row.innerHTML = `
                    <td>${student.registration_no || '-'}</td>
                    <td>${student.full_name}</td>
                    <td>${student.email}</td>
                    <td><span class="badge bg-success">Active</span></td>
                `;
            });
        }
    } catch (err) {
        console.error('Error loading students:', err);
    }
}

// ============================================
// LOAD TEACHERS
// ============================================

async function loadTeachers() {
    try {
        const response = await apiCall('/admin_teachers');
        if (!response) return;
        
        const data = await response.json();
        
        if (data.status === 'success') {
            const tbody = document.getElementById('teachersTableBody');
            if (!tbody) return;
            
            tbody.innerHTML = '';
            
            data.teachers.forEach(teacher => {
                const row = tbody.insertRow();
                row.innerHTML = `
                    <td>${teacher.employee_id || '-'}</td>
                    <td>${teacher.full_name}</td>
                    <td>${teacher.email}</td>
                    <td>${teacher.qualification || '-'}</td>
                `;
            });
        }
    } catch (err) {
        console.error('Error loading teachers:', err);
    }
}

// ============================================
// SECTION NAVIGATION
// ============================================

function showSection(sectionId) {
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    const activeSection = document.getElementById(sectionId);
    if (activeSection) activeSection.classList.add('active');
    
    if (sectionId === 'students') loadStudents();
    if (sectionId === 'teachers') loadTeachers();
}

// ============================================
// LOGOUT
// ============================================

function logout() {
    localStorage.clear();
    window.location.href = '/';
}

// ============================================
// CHART
// ============================================

let statsChart = null;

function initChart() {
    const ctx = document.getElementById('attendanceAreaChart');
    if (!ctx) return;
    
    statsChart = new Chart(ctx.getContext('2d'), {
        type: 'line',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
            datasets: [{
                label: 'Attendance Rate',
                data: [82, 85, 88, 90, 87, 75],
                borderColor: '#3498db',
                backgroundColor: 'rgba(52, 152, 219, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    title: { display: true, text: 'Percentage (%)' }
                }
            }
        }
    });
}

// ============================================
// INITIALIZE
// ============================================

loadStats();
initChart();