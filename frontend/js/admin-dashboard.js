// Section Navigation Logic
function showSection(sectionId) {
// Hide all sections
document.querySelectorAll('.content-section').forEach(section => {
    section.classList.remove('active');
});
// Deactivate all nav links
document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.remove('active');
});

// Show selected section
document.getElementById(sectionId).classList.add('active');
// Active current link
event.currentTarget.classList.add('active');
}

// Initialize Tooltips
function initTooltips() {
var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
tooltipTriggerList.map(function (el) { return new bootstrap.Tooltip(el) });
}
initTooltips();

// Chart Initialization
const ctx = document.getElementById('attendanceAreaChart').getContext('2d');
new Chart(ctx, {
type: 'line',
data: {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    datasets: [{
        label: 'Presence Rate',
        data: [820, 950, 880, 1100, 990, 750],
        borderColor: '#3498db',
        backgroundColor: 'rgba(52, 152, 219, 0.1)',
        fill: true,
        tension: 0.4
    }]
},
options: { responsive: true, maintainAspectRatio: false }
});

function logout() {
    if(confirm("Are you sure you want to logout?")) {
        window.location.href = "index.html";
    }
}