// frontend/js/events.js

// ============================================
// Events Module
// ============================================

let currentEvents = [];
let currentManageEventId = null;

// ============================================
// Load All Events
// ============================================
async function loadEvents() {
    const loading = document.getElementById('eventsLoading');
    const grid = document.getElementById('eventsGrid');

    loading?.classList.remove('hidden');

    const status = document.getElementById('eventFilter')?.value || '';
    const search = document.getElementById('eventSearch')?.value || '';

    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (search) params.append('search', search);
    params.append('limit', '50');

    const result = await apiRequest(`/events?${params.toString()}`);

    loading?.classList.add('hidden');

    if (result.success) {
        currentEvents = result.data;
        renderEventCards(result.data);
    } else {
        grid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <i class="fas fa-calendar-times"></i>
                <h3>Failed to load events</h3>
                <p>${result.message}</p>
            </div>
        `;
    }
}

// ============================================
// Render Event Cards
// ============================================
function renderEventCards(events) {
    const grid = document.getElementById('eventsGrid');

    if (events.length === 0) {
        grid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <i class="fas fa-calendar-xmark"></i>
                <h3>No events found</h3>
                <p>There are no events matching your criteria.</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = events.map(event => {
        const fillPercentage = (event.current_participants / event.max_participants) * 100;
        const isFull = event.current_participants >= event.max_participants;

        return `
            <div class="event-card">
                <div class="event-image">
                    ${event.event_image
                        ? `<img src="${event.event_image}" alt="${event.title}">`
                        : `<i class="${getCategoryIcon(event.category)}"></i>`
                    }
                    <span class="event-category-badge">${event.category}</span>
                    <span class="event-status-badge status-${event.status}">
                        ${event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                    </span>
                </div>
                <div class="event-body">
                    <h3>${event.title}</h3>
                    <p>${event.description || 'No description available.'}</p>
                    <div class="event-meta">
                        <div class="event-meta-item">
                            <i class="fas fa-calendar"></i>
                            ${formatDate(event.event_date)}
                        </div>
                        <div class="event-meta-item">
                            <i class="fas fa-clock"></i>
                            ${formatTime(event.start_time)} - ${formatTime(event.end_time)}
                        </div>
                        <div class="event-meta-item">
                            <i class="fas fa-map-marker-alt"></i>
                            ${event.location}
                        </div>
                        ${event.speaker ? `
                            <div class="event-meta-item">
                                <i class="fas fa-user-tie"></i>
                                ${event.speaker}
                            </div>
                        ` : ''}
                    </div>
                    <div class="event-progress">
                        <div class="progress-bar">
                            <div class="progress-fill ${isFull ? 'full' : ''}"
                                 style="width: ${Math.min(fillPercentage, 100)}%"></div>
                        </div>
                        <span class="progress-text">
                            ${event.current_participants} / ${event.max_participants} participants
                            ${isFull ? ' (FULL)' : ''}
                        </span>
                    </div>
                    <div class="event-actions">
                        <button class="btn btn-outline btn-sm"
                                onclick="viewEventDetail(${event.event_id})">
                            <i class="fas fa-eye"></i> View
                        </button>
                        ${!isAdmin() && event.status === 'upcoming'
                            && event.is_registration_open ? `
                            <button class="btn btn-primary btn-sm"
                                    onclick="registerForEvent(${event.event_id})"
                                    ${isFull ? 'disabled' : ''}>
                                <i class="fas fa-user-plus"></i>
                                ${isFull ? 'Full' : 'Register'}
                            </button>
                        ` : ''}
                        ${isAdmin() ? `
                            <button class="btn btn-info btn-sm"
                                    onclick="manageEvent(${event.event_id})">
                                <i class="fas fa-cog"></i> Manage
                            </button>
                            <button class="btn btn-danger btn-sm"
                                    onclick="deleteEvent(${event.event_id})">
                                <i class="fas fa-trash"></i>
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// ============================================
// Search & Filter Events
// ============================================
const searchEvents = debounce(() => loadEvents(), 300);
function filterEvents() { loadEvents(); }

// ============================================
// View Event Detail
// ============================================
async function viewEventDetail(eventId) {
    const result = await apiRequest(`/events/${eventId}`);

    if (!result.success) {
        showToast('Failed to load event details', 'error');
        return;
    }

    const event = result.data;
    const modal = document.getElementById('eventDetailModal');
    document.getElementById('detailEventTitle').textContent = event.title;

    // Check if user is registered
    let registrationStatus = null;
    if (isLoggedIn() && !isAdmin()) {
        const regCheck = await apiRequest(`/registrations/check/${eventId}`);
        registrationStatus = regCheck;
    }

    document.getElementById('eventDetailContent').innerHTML = `
        ${event.event_image
            ? `<img src="${event.event_image}"
                    style="width:100%;max-height:250px;object-fit:cover;
                    border-radius:var(--radius);margin-bottom:20px">`
            : ''}
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">
            <div>
                <strong><i class="fas fa-calendar"></i> Date:</strong><br>
                ${formatDate(event.event_date)}
            </div>
            <div>
                <strong><i class="fas fa-clock"></i> Time:</strong><br>
                ${formatTime(event.start_time)} - ${formatTime(event.end_time)}
            </div>
            <div>
                <strong><i class="fas fa-map-marker-alt"></i> Location:</strong><br>
                ${event.location}
            </div>
            <div>
                <strong><i class="fas fa-tag"></i> Category:</strong><br>
                ${event.category}
            </div>
            ${event.speaker ? `
                <div>
                    <strong><i class="fas fa-user-tie"></i> Speaker:</strong><br>
                    ${event.speaker}
                </div>
            ` : ''}
            ${event.organizer ? `
                <div>
                    <strong><i class="fas fa-building"></i> Organizer:</strong><br>
                    ${event.organizer}
                </div>
            ` : ''}
            <div>
                <strong><i class="fas fa-users"></i> Participants:</strong><br>
                ${event.current_participants} / ${event.max_participants}
            </div>
            <div>
                <strong><i class="fas fa-hourglass-end"></i> Deadline:</strong><br>
                ${formatDateTime(event.registration_deadline)}
            </div>
        </div>
        ${event.description ? `
            <div style="margin-bottom:20px">
                <strong>Description:</strong><br>
                <p style="color:var(--text-secondary)">${event.description}</p>
            </div>
        ` : ''}
        ${registrationStatus && registrationStatus.is_registered ? `
            <div class="card" style="background:var(--success-light);
                 border-color:var(--success)">
                <p style="color:var(--success);font-weight:600">
                    <i class="fas fa-check-circle"></i>
                    You are registered for this event!
                </p>
                <p style="font-size:0.85rem;color:var(--text-secondary);margin-top:4px">
                    Status: ${registrationStatus.data.attendance_status}
                </p>
            </div>
        ` : ''}
        ${!isAdmin() && event.status === 'upcoming' && event.is_registration_open
            && !(registrationStatus && registrationStatus.is_registered) ? `
            <button class="btn btn-primary btn-block"
                    onclick="registerForEvent(${event.event_id}); closeEventDetailModal();">
                <i class="fas fa-user-plus"></i> Register for this Event
            </button>
        ` : ''}
    `;

    modal.classList.remove('hidden');
}

function closeEventDetailModal() {
    document.getElementById('eventDetailModal').classList.add('hidden');
}

// ============================================
// Create/Edit Event Modal
// ============================================
function showCreateEventModal() {
    document.getElementById('editEventId').value = '';
    document.getElementById('eventModalTitle').innerHTML =
        '<i class="fas fa-calendar-plus"></i> Create New Event';
    document.getElementById('eventForm').reset();
    document.getElementById('eventModal').classList.remove('hidden');
}

function showEditEventModal(event) {
    document.getElementById('editEventId').value = event.event_id;
    document.getElementById('eventModalTitle').innerHTML =
        '<i class="fas fa-edit"></i> Edit Event';

    document.getElementById('eventTitle').value = event.title;
    document.getElementById('eventDescription').value = event.description || '';
    document.getElementById('eventDate').value = event.event_date?.split('T')[0];
    document.getElementById('eventStartTime').value = event.start_time;
    document.getElementById('eventEndTime').value = event.end_time;
    document.getElementById('eventLocation').value = event.location;
    document.getElementById('eventSpeaker').value = event.speaker || '';
    document.getElementById('eventOrganizer').value = event.organizer || '';
    document.getElementById('eventMaxParticipants').value = event.max_participants;
    document.getElementById('eventCategory').value = event.category;

    // Format deadline for datetime-local input
    if (event.registration_deadline) {
        const deadline = new Date(event.registration_deadline);
        const formattedDeadline = deadline.toISOString().slice(0, 16);
        document.getElementById('eventDeadline').value = formattedDeadline;
    }

    document.getElementById('eventModal').classList.remove('hidden');
}

function closeEventModal() {
    document.getElementById('eventModal').classList.add('hidden');
}

// ============================================
// Event Form Submit (Create/Edit)
// ============================================
document.getElementById('eventForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const eventId = document.getElementById('editEventId').value;
    const isEdit = !!eventId;

    const formData = new FormData();
    formData.append('title', document.getElementById('eventTitle').value);
    formData.append('description', document.getElementById('eventDescription').value);
    formData.append('event_date', document.getElementById('eventDate').value);
    formData.append('start_time', document.getElementById('eventStartTime').value);
    formData.append('end_time', document.getElementById('eventEndTime').value);
    formData.append('location', document.getElementById('eventLocation').value);
    formData.append('speaker', document.getElementById('eventSpeaker').value);
    formData.append('organizer', document.getElementById('eventOrganizer').value);
    formData.append('max_participants',
        document.getElementById('eventMaxParticipants').value);
    formData.append('registration_deadline',
        document.getElementById('eventDeadline').value);
    formData.append('category', document.getElementById('eventCategory').value);

    const imageFile = document.getElementById('eventImage').files[0];
    if (imageFile) {
        formData.append('event_image', imageFile);
    }

    const endpoint = isEdit ? `/events/${eventId}` : '/events';
    const method = isEdit ? 'PUT' : 'POST';

    const result = await apiRequest(endpoint, method, formData, true);

    if (result.success) {
        showToast(
            isEdit ? 'Event updated successfully!' : 'Event created successfully!',
            'success'
        );
        closeEventModal();
        loadEvents();
    } else {
        showToast(result.message || 'Failed to save event', 'error');
    }
});

// ============================================
// Delete Event
// ============================================
async function deleteEvent(eventId) {
    if (!confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
        return;
    }

    const result = await apiRequest(`/events/${eventId}`, 'DELETE');

    if (result.success) {
        showToast('Event deleted successfully!', 'success');
        loadEvents();
    } else {
        showToast(result.message || 'Failed to delete event', 'error');
    }
}

// ============================================
// Manage Event (Admin)
// ============================================
async function manageEvent(eventId) {
    currentManageEventId = eventId;
    navigateTo('manageEventPage');

    // Load event details
    const eventResult = await apiRequest(`/events/${eventId}`);
    if (eventResult.success) {
        document.getElementById('manageEventTitle').textContent =
            eventResult.data.title;
    }

    // Load participants
    await loadParticipants(eventId);

    // Switch to participants tab by default
    switchTab('participantsTab',
        document.querySelector('.tabs .tab:first-child'));
}