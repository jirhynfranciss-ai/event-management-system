// frontend/js/attendance.js

// ============================================
// Attendance Module
// ============================================

let currentParticipants = [];

// ============================================
// Load Participants for Event
// ============================================
async function loadParticipants(eventId) {
    const result = await apiRequest(`/events/${eventId}/participants`);

    if (result.success) {
        currentParticipants = result.data;
        renderParticipantsTable(result.data);
        renderAttendanceTable(result.data);
    }
}

// ============================================
// Render Participants Table
// ============================================
function renderParticipantsTable(participants) {
    const tbody = document.getElementById('participantsTableBody');
    if (!tbody) return;

    if (participants.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-muted" style="padding:40px">
                    No participants registered yet.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = participants.map((p, i) => `
        <tr>
            <td>${i + 1}</td>
            <td><strong>${p.name}</strong></td>
            <td>${p.email}</td>
            <td>${p.course || '-'}</td>
            <td>${p.year_level || '-'}</td>
            <td>${formatDateTime(p.registration_date)}</td>
            <td>
                <span class="attendance-status attendance-${p.attendance_status}">
                    ${p.attendance_status === 'present' ? '✓ Present' :
                      p.attendance_status === 'absent' ? '✗ Absent' :
                      '◯ Pending'}
                </span>
            </td>
        </tr>
    `).join('');
}

// ============================================
// Render Attendance Table
// ============================================
function renderAttendanceTable(participants) {
    const tbody = document.getElementById('attendanceTableBody');
    if (!tbody) return;

    if (participants.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-muted" style="padding:40px">
                    No participants to manage attendance.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = participants.map(p => `
        <tr data-registration-id="${p.registration_id}">
            <td>
                <input type="checkbox" class="attendance-checkbox"
                       data-id="${p.registration_id}"
                       ${p.attendance_status === 'present' ? 'checked' : ''}>
            </td>
            <td><strong>${p.name}</strong></td>
            <td>${p.course || '-'}</td>
            <td>
                <select class="attendance-select"
                        data-id="${p.registration_id}"
                        style="padding:6px 10px;border:1px solid var(--border);
                               border-radius:var(--radius)">
                    <option value="registered"
                            ${p.attendance_status === 'registered' ? 'selected' : ''}>
                        Pending
                    </option>
                    <option value="present"
                            ${p.attendance_status === 'present' ? 'selected' : ''}>
                        Present
                    </option>
                    <option value="absent"
                            ${p.attendance_status === 'absent' ? 'selected' : ''}>
                        Absent
                    </option>
                </select>
            </td>
            <td>${p.attendance_time
                    ? formatDateTime(p.attendance_time)
                    : '-'}</td>
            <td>
                <button class="btn btn-success btn-sm"
                        onclick="markSingleAttendance(${p.registration_id}, 'present')">
                    <i class="fas fa-check"></i>
                </button>
                <button class="btn btn-danger btn-sm"
                        onclick="markSingleAttendance(${p.registration_id}, 'absent')">
                    <i class="fas fa-times"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// ============================================
// Mark Single Attendance
// ============================================
async function markSingleAttendance(registrationId, status) {
    const result = await apiRequest('/attendance/mark', 'POST', {
        registration_id: registrationId,
        status: status
    });

    if (result.success) {
        showToast(`Attendance marked as ${status}`, 'success');
        loadParticipants(currentManageEventId);
        loadEventAnalytics(currentManageEventId);
    } else {
        showToast(result.message, 'error');
    }
}

// ============================================
// Toggle All Attendance Checkboxes
// ============================================
function toggleAllAttendance() {
    const selectAll = document.getElementById('selectAllAttendance');
    const checkboxes = document.querySelectorAll('.attendance-checkbox');

    checkboxes.forEach(cb => cb.checked = selectAll.checked);
}

// ============================================
// Mark All Present
// ============================================
function markAllPresent() {
    const selects = document.querySelectorAll('.attendance-select');
    const checkboxes = document.querySelectorAll('.attendance-checkbox');

    selects.forEach(s => s.value = 'present');
    checkboxes.forEach(cb => cb.checked = true);

    showToast('All marked as present. Click "Save Attendance" to confirm.', 'info');
}

// ============================================
// Save Attendance (Bulk)
// ============================================
async function saveAttendance() {
    const selects = document.querySelectorAll('.attendance-select');
    const attendees = [];

    selects.forEach(select => {
        if (select.value !== 'registered') {
            attendees.push({
                registration_id: parseInt(select.dataset.id),
                status: select.value
            });
        }
    });

    if (attendees.length === 0) {
        showToast('No attendance changes to save.', 'warning');
        return;
    }

    const result = await apiRequest('/attendance/bulk-mark', 'POST', {
        event_id: currentManageEventId,
        attendees
    });

    if (result.success) {
        showToast(result.message, 'success');
        loadParticipants(currentManageEventId);
        loadEventAnalytics(currentManageEventId);
    } else {
        showToast(result.message, 'error');
    }
}