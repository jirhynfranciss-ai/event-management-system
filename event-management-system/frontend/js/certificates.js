// frontend/js/certificates.js

// ============================================
// Certificates Module
// ============================================

// ============================================
// Bulk Generate Certificates for Event
// ============================================
async function bulkGenerateCertificates() {
    if (!currentManageEventId) return;

    if (!confirm('Generate certificates for all attendees who are marked present?')) {
        return;
    }

    const result = await apiRequest('/certificates/bulk-generate', 'POST', {
        event_id: currentManageEventId
    });

    if (result.success) {
        showToast(result.message, 'success');
        loadCertificatesForEvent(currentManageEventId);
    } else {
        showToast(result.message, 'error');
    }
}

// ============================================
// Load Certificates for Managed Event
// ============================================
async function loadCertificatesForEvent(eventId) {
    const container = document.getElementById('certificatesList');
    if (!container) return;

    // Get participants who are present
    const result = await apiRequest(`/events/${eventId}/participants`);

    if (!result.success) return;

    const presentParticipants = result.data.filter(
        p => p.attendance_status === 'present'
    );

    if (presentParticipants.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-certificate"></i>
                <h3>No Attendees Yet</h3>
                <p>Mark attendance first before generating certificates.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div class="table-responsive">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Student Name</th>
                        <th>Email</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${presentParticipants.map((p, i) => `
                        <tr>
                            <td>${i + 1}</td>
                            <td><strong>${p.name}</strong></td>
                            <td>${p.email}</td>
                            <td>
                                <span class="attendance-status attendance-present">
                                    ✓ Present
                                </span>
                            </td>
                            <td>
                                <button class="btn btn-primary btn-sm"
                                        onclick="generateSingleCertificate(${p.user_id}, ${eventId})">
                                    <i class="fas fa-file-pdf"></i> Generate
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// ============================================
// Generate Single Certificate
// ============================================
async function generateSingleCertificate(userId, eventId) {
    const result = await apiRequest('/certificates/generate', 'POST', {
        user_id: userId,
        event_id: eventId
    });

    if (result.success) {
        showToast(result.message, 'success');

        if (result.data.file_path) {
            window.open(result.data.file_path, '_blank');
        }
    } else {
        showToast(result.message, 'error');
    }
}

// ============================================
// Load My Certificates (Student)
// ============================================
async function loadMyCertificates() {
    const container = document.getElementById('myCertificatesGrid');
    if (!container) return;

    const result = await apiRequest('/certificates/my-certificates');

    if (!result.success) {
        container.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <i class="fas fa-exclamation-circle"></i>
                <h3>Failed to load certificates</h3>
            </div>
        `;
        return;
    }

    if (result.data.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <i class="fas fa-award"></i>
                <h3>No Certificates Yet</h3>
                <p>Attend events to receive certificates.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = result.data.map(cert => `
        <div class="certificate-card">
            <div class="cert-icon">
                <i class="fas fa-award"></i>
            </div>
            <h4>${cert.event_title}</h4>
            <p>${formatDate(cert.event_date)}</p>
            <p>${cert.organizer || ''}</p>
            <div class="cert-code">${cert.certificate_code}</div>
            <p style="font-size:0.75rem;color:var(--text-light)">
                Generated: ${formatDateTime(cert.generated_date)}
            </p>
            <button class="btn btn-primary btn-sm mt-2"
                    onclick="downloadCertificate(${cert.certificate_id})">
                <i class="fas fa-download"></i> Download PDF
            </button>
        </div>
    `).join('');
}

// ============================================
// Download Certificate
// ============================================
async function downloadCertificate(certificateId) {
    const token = localStorage.getItem('token');
    window.open(
        `${API_BASE}/certificates/download/${certificateId}?token=${token}`,
        '_blank'
    );
}