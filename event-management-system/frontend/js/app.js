// frontend/js/app.js

// ============================================
// Main Application Controller
// ============================================

// ============================================
// Initialize Application
// ============================================
function initializeApp() {
    if (isLoggedIn()) {
        const user = getCurrentUser();
        setupAuthenticatedUI(user);
    } else {
        setupGuestUI();
    }
}

// ============================================
// Setup UI for Authenticated Users
// ============================================
function setupAuthenticatedUI(user) {
    const navLinks = document.getElementById('navLinks');
    const navUser = document.getElementById('navUser');

    if (user.role === 'admin') {
        // Admin Navigation
        navLinks.innerHTML = `
            <button class="nav-link active" data-page="dashboardPage"
                    onclick="navigateTo('dashboardPage'); loadDashboard();">
                <i class="fas fa-tachometer-alt"></i> Dashboard
            </button>
            <button class="nav-link" data-page="eventsPage"
                    onclick="navigateTo('eventsPage'); loadEvents();">
                <i class="fas fa-calendar-alt"></i> Events
            </button>
            <button class="nav-link" data-page="analyticsPage"
                    onclick="navigateTo('analyticsPage'); loadOverallAnalytics();">
                <i class="fas fa-chart-line"></i> Analytics
            </button>
        `;

        // Show admin-only elements
        document.querySelectorAll('.admin-only').forEach(
            el => el.classList.remove('hidden')
        );

        // Load dashboard initially
        navigateTo('dashboardPage');
        loadDashboard();
    } else {
        // Student Navigation
        navLinks.innerHTML = `
            <button class="nav-link active" data-page="eventsPage"
                    onclick="navigateTo('eventsPage'); loadEvents();">
                <i class="fas fa-calendar-alt"></i> Events
            </button>
            <button class="nav-link" data-page="myRegistrationsPage"
                    onclick="navigateTo('myRegistrationsPage'); loadMyRegistrations();">
                <i class="fas fa-clipboard-check"></i> My Registrations
            </button>
            <button class="nav-link" data-page="myCertificatesPage"
                    onclick="navigateTo('myCertificatesPage'); loadMyCertificates();">
                <i class="fas fa-award"></i> My Certificates
            </button>
        `;

        // Hide admin-only elements
        document.querySelectorAll('.admin-only').forEach(
            el => el.classList.add('hidden')
        );

        // Load events initially
        navigateTo('eventsPage');
        loadEvents();
    }

    // User info in navbar
    navUser.innerHTML = `
        <span class="user-name">${user.name}</span>
        <span class="user-role">${user.role}</span>
        <button class="btn-logout" onclick="logout()">
            <i class="fas fa-sign-out-alt"></i> Logout
        </button>
    `;

    // Hide auth page
    document.getElementById('authPage').classList.remove('active');
}

// ============================================
// Setup UI for Guest Users
// ============================================
function setupGuestUI() {
    const navLinks = document.getElementById('navLinks');
    const navUser = document.getElementById('navUser');

    navLinks.innerHTML = '';
    navUser.innerHTML = '';

    // Show only auth page
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('authPage').classList.add('active');

    // Hide admin-only elements
    document.querySelectorAll('.admin-only').forEach(
        el => el.classList.add('hidden')
    );
}

// ============================================
// Mobile Navigation Toggle
// ============================================
document.getElementById('navToggle')?.addEventListener('click', () => {
    document.getElementById('navLinks').classList.toggle('show');
});

// ============================================
// Close modal on outside click
// ============================================
document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.classList.add('hidden');
        }
    });
});

// ============================================
// Handle Tab Switch with Data Loading
// ============================================
const originalSwitchTab = switchTab;

// Override switchTab to load data when switching
function switchTab(tabId, btn) {
    // Call original function
    document.querySelectorAll('.tab-content').forEach(
        t => t.classList.remove('active')
    );
    document.querySelectorAll('.tab').forEach(
        t => t.classList.remove('active')
    );
    document.getElementById(tabId)?.classList.add('active');
    btn?.classList.add('active');

    // Load data based on tab
    if (tabId === 'attendanceTab') {
        loadParticipants(currentManageEventId);
    } else if (tabId === 'certificatesTab') {
        loadCertificatesForEvent(currentManageEventId);
    } else if (tabId === 'analyticsTab') {
        loadEventAnalytics(currentManageEventId);
    }
}

// ============================================
// Keyboard shortcuts
// ============================================
document.addEventListener('keydown', (e) => {
    // ESC to close modals
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay').forEach(
            m => m.classList.add('hidden')
        );
    }
});

// ============================================
// Initialize on DOM Ready
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('📅 Event Management System initialized');
    initializeApp();
});