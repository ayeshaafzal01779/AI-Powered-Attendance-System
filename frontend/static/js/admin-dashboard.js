// Role Check
const user = JSON.parse(localStorage.getItem('user'));
const userId = localStorage.getItem('userId');
const userRole = localStorage.getItem('userRole');

if (!user || !userId || userRole !== 'Admin') {
    alert('Access Denied. Admin only.');
    window.location.href = '/';
}

async function apiCall(url, options = {}) {
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            'X-User-Id': userId
        }
    };
    
    const mergedOptions = { ...defaultOptions, ...options };
    mergedOptions.headers = { ...defaultOptions.headers, ...options.headers };
    
    const response = await fetch(url, mergedOptions);
    
    if (response.status === 401 || response.status === 403) {
        alert('Session expired. Please login again.');
        localStorage.clear();
        window.location.href = '/';
        return null;
    }
    
    return response;
}

async function loadStats() {
    try {
        const response = await apiCall('http://127.0.0.1:5000/admin_stats');
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

async function loadStudents() {
    try {
        const response = await apiCall('http://127.0.0.1:5000/admin_students');
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

async function loadTeachers() {
    try {
        const response = await apiCall('http://127.0.0.1:5000/admin_teachers');
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

function showSection(sectionId) {
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    const activeSection = document.getElementById(sectionId);
    if (activeSection) activeSection.classList.add('active');
    
    if (sectionId === 'students') loadStudents();
    if (sectionId === 'teachers') loadTeachers();
}

function logout() {
    localStorage.clear();
    window.location.href = '/';
}

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

loadStats();
initChart();