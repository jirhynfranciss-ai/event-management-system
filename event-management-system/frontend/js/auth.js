// frontend/js/auth.js

// ============================================
// Authentication Module
// ============================================

function showLoginForm() {
    document.getElementById('loginCard').classList.remove('hidden');
    document.getElementById('registerCard').classList.add('hidden');
}

function showRegisterForm() {
    document.getElementById('loginCard').classList.add('hidden');
    document.getElementById('registerCard').classList.remove('hidden');
}

// ============================================
// Login Handler
// ============================================
document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';

    const result = await apiRequest('/auth/login', 'POST', { email, password });

    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login';

    if (result.success) {
        localStorage.setItem('token', result.data.token);
        localStorage.setItem('user', JSON.stringify(result.data));
        showToast('Login successful! Welcome back!', 'success');
        initializeApp();
    } else {
        showToast(result.message || 'Login failed', 'error');
    }
});

// ============================================
// Register Handler
// ============================================
document.getElementById('registerForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const userData = {
        name: document.getElementById('regName').value,
        email: document.getElementById('regEmail').value,
        password: document.getElementById('regPassword').value,
        course: document.getElementById('regCourse').value,
        year_level: document.getElementById('regYear').value,
        gender: document.getElementById('regGender').value
    };

    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating account...';

    const result = await apiRequest('/auth/register', 'POST', userData);

    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-user-plus"></i> Register';

    if (result.success) {
        localStorage.setItem('token', result.data.token);
        localStorage.setItem('user', JSON.stringify(result.data));
        showToast('Account created successfully!', 'success');
        initializeApp();
    } else {
        showToast(result.message || 'Registration failed', 'error');
    }
});

// ============================================
// Logout Handler
// ============================================
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    showToast('Logged out successfully', 'info');
    initializeApp();
}

// ============================================
// Check if user is logged in
// ============================================
function isLoggedIn() {
    return !!localStorage.getItem('token');
}

// ============================================
// Get current user
// ============================================
function getCurrentUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
}

// ============================================
// Check if user is admin
// ============================================
function isAdmin() {
    const user = getCurrentUser();
    return user && user.role === 'admin';
}