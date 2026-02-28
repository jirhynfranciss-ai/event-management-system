// frontend/js/utils.js

// ============================================
// API Configuration
// ============================================
const API_BASE = '/api';

// ============================================
// HTTP Request Helper
// ============================================
async function apiRequest(endpoint, method = 'GET', body = null, isFormData = false) {
    const token = localStorage.getItem('token');

    const headers = {};
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    if (!isFormData) {
        headers['Content-Type'] = 'application/json';
    }

    const options = {
        method,
        headers
    };

    if (body) {
        options.body = isFormData ? body : JSON.stringify(body);
    }

    try {
        const response = await fetch(`${API_BASE}${endpoint}`, options);
        const data = await response.json();

        if (response.status === 401) {
            // Token expired or invalid
            logout();
            return data;
        }

        return data;
    } catch (error) {
        console.error('API Error:', error);
        showToast('Network error. Please try again.', 'error');
        return { success: false, message: 'Network error' };
    }
}

// ============================================
// Toast Notification
// ============================================
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');

    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        warning: 'fas fa-exclamation-triangle',
        info: 'fas fa-info-circle'
    };

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <i class="${icons[type]}"></i>
        <span>${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 4000);
}

// ============================================
// Date Formatting
// ============================================
function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function formatDateTime(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatTime(timeStr) {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
}

// ============================================
// Page Navigation
// ============================================
function navigateTo(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

    const page = document.getElementById(pageId);
    if (page) {
        page.classList.add('active');
    }

    // Update active nav link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.dataset.page === pageId) {
            link.classList.add('active');
        }
    });

    // Close mobile nav
    document.getElementById('navLinks')?.classList.remove('show');
}

// ============================================
// Tab Switching
// ============================================
function switchTab(tabId, btn) {
    document.querySelectorAll('.tab-content').forEach(t => {
        t.classList.remove('active');
    });
    document.querySelectorAll('.tab').forEach(t => {
        t.classList.remove('active');
    });

    document.getElementById(tabId)?.classList.add('active');
    btn?.classList.add('active');
}

// ============================================
// Get Category Icon
// ============================================
function getCategoryIcon(category) {
    const icons = {
        'Seminar': 'fas fa-chalkboard-teacher',
        'Workshop': 'fas fa-tools',
        'Competition': 'fas fa-trophy',
        'Academic': 'fas fa-graduation-cap',
        'Cultural': 'fas fa-theater-masks',
        'Sports': 'fas fa-running',
        'Other': 'fas fa-calendar'
    };
    return icons[category] || icons['Other'];
}

// ============================================
// Debounce Function
// ============================================
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}