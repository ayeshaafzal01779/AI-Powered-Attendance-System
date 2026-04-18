// ============================================
// LOGIN JS - WITH DYNAMIC URL
// ============================================

const API_BASE_URL = 'http://' + window.location.hostname + ':5000';

async function login() {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const errorMsg = document.getElementById('errorMsg');
    const loadingMsg = document.getElementById('loadingMsg');
    
    errorMsg.style.display = 'none';
    errorMsg.textContent = '';
    
    if (!email || !password) {
        errorMsg.textContent = 'Please enter email and password';
        errorMsg.style.display = 'block';
        return;
    }
    
    loadingMsg.style.display = 'block';
    
    try {
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            credentials: 'include',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        loadingMsg.style.display = 'none';
        
        if (response.ok && data.status === 'success') {
            localStorage.setItem('user', JSON.stringify(data.user));
            localStorage.setItem('userId', data.user.id);
            localStorage.setItem('userRole', data.user.role);
            localStorage.setItem('userName', data.user.name);
            
            const role = data.user.role.toLowerCase();
            if (role === 'admin') {
                window.location.href = '/admin_dashboard';
            } else if (role === 'teacher') {
                window.location.href = '/teacher_dashboard';
            } else if (role === 'student') {
                window.location.href = '/student_dashboard';
            }
        } else {
            errorMsg.textContent = data.message || 'Invalid email or password';
            errorMsg.style.display = 'block';
        }
    } catch (error) {
        loadingMsg.style.display = 'none';
        console.error('Login error:', error);
        errorMsg.textContent = 'Cannot connect to server. Make sure backend is running.';
        errorMsg.style.display = 'block';
    }
}

document.getElementById('password')?.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') login();
});

document.getElementById('email')?.focus();