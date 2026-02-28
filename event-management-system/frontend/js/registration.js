// frontend/js/registration.js

// ============================================
// Registration Module
// ============================================

// ============================================
// Register for Event
// ============================================
async function registerForEvent(eventId) {
    if (!isLoggedIn()) {
        showToast('Please login to register for events.', 'warning');
        navigateTo('authPage');
        return;
    }

    if (isAdmin()) {
        showToast('Admins cannot register for events.', 'warning');
        return;
    }

    // Check if already registered
    const check = await apiRequest(`/registrations/check/${eventId}`);
    if (check.success && check.is_registered) {
        showToast('You are already registered for this event.', 'warning');
        return;
    }

    if (!confirm('Do you want to register for this event?')) {
        return;
    }

    const result = await apiRequest('/registrations', 'POST', {
        event_id: eventId
    });

    if (result.success) {
        showToast(result.message, 'success');
        loadEvents();
        loadMyRegistrations();
    } else {
        showToast(result.message || 'Registration failed', 'error');
    }
}

// ============================================
// Load My Registrations
// ============================================
async function loadMyRegistrations() {
    const container = document.getElementById('myRegistrationsList');
    if (!container) return;

    const result = await apiRequest('/registrations/my-registrations');

    if (!result.success) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-circle"></i>
                <h3>Failed to load registrations</h3>
            </div>
        `;
        return;
    }

    if (result.data.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-clipboard"></i>
                <h3>No Registrations Yet</h3>
                <p>Browse events and register to see them here.</p>
                <button class="btn btn-primary mt-4"
                        onclick="navigateTo('eventsPage')">
                    <i class="fas fa-calendar"></i> Browse Events
                </button>
            </div>
        `;
        return;
    }

    container.innerHTML = result.data.map(reg => `
        <div class="registration-card">
            <div class="registration-info">
                <h3>${reg.title}</h3>
                <div class="meta">
                    <span>
                        <i class="fas fa-calendar"></i>
                        ${formatDate(reg.event_date)}
                    </span>
                    <span>
                        <i class="fas fa-clock"></i>
                        ${formatTime(reg.start_time)} - ${formatTime(reg.end_time)}
                    </span>
                    <span>
                        <i class="fas fa-map-marker-alt"></i>
                        ${reg.location}
                    </span>
                    <span>
                        <i class="fas fa-tag"></i>
                        ${reg.category}
                    </span>
                </div>
                <div class="mt-2">
                    <span class="attendance-status attendance-${reg.attendance_status}">
                        ${reg.attendance_status === 'present' ? '✓ Present' :
                          reg.attendance_status === 'absent' ? '✗ Absent' :
                          '◯ Registered'}
                    </span>
                    <span class="badge status-${reg.event_status}" style="margin-left:8px">
                        ${reg.event_status}
                    </span>
                </div>
            </div>
            <div class="registration-actions">
                ${reg.certificate_path ? `
                    <button class="btn btn-success btn-sm"
                            onclick="downloadCertificate(${reg.certificate_id})">
                        <i class="fas fa-download"></i> Certificate
                    </button>
                ` : ''}
                ${reg.event_status === 'upcoming' ? `
                    <button class="btn btn-danger btn-sm"
                            onclick="cancelRegistration(${reg.registration_id})">
                        <i class="fas fa-times"></i> Cancel
                    </button>
                ` : ''}
            </div>
        </div>
    `).join('');
}

// ============================================
// Cancel Registration
// ============================================
async function cancelRegistration(registrationId) {
    if (!confirm('Are you sure you want to cancel this registration?')) {
        return;
    }

    const result = await apiRequest(
        `/registrations/${registrationId}`, 'DELETE'
    );

    if (result.success) {
        showToast(result.message, 'success');
        loadMyRegistrations();
        loadEvents();
    } else {
        showToast(result.message || 'Failed to cancel registration', 'error');
    }
}