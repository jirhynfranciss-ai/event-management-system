// frontend/js/analytics.js

// ============================================
// Analytics Module
// ============================================

let chartInstances = {};

// ============================================
// Destroy existing chart before creating new one
// ============================================
function destroyChart(chartId) {
    if (chartInstances[chartId]) {
        chartInstances[chartId].destroy();
        delete chartInstances[chartId];
    }
}

// ============================================
// Load Dashboard Data (Admin)
// ============================================
async function loadDashboard() {
    const result = await apiRequest('/analytics/dashboard');

    if (!result.success) return;

    const { overview, events_by_status, recent_registrations } = result.data;

    // Update stat cards
    document.getElementById('statEvents').textContent = overview.total_events;
    document.getElementById('statStudents').textContent = overview.total_students;
    document.getElementById('statRegistrations').textContent =
        overview.total_registrations;
    document.getElementById('statCertificates').textContent =
        overview.total_certificates;

    // Events by Status Chart
    const statusLabels = events_by_status.map(
        s => s.status.charAt(0).toUpperCase() + s.status.slice(1)
    );
    const statusData = events_by_status.map(s => s.count);

    destroyChart('eventStatusChart');
    const statusCtx = document.getElementById('eventStatusChart')?.getContext('2d');
    if (statusCtx) {
        chartInstances['eventStatusChart'] = new Chart(statusCtx, {
            type: 'bar',
            data: {
                labels: statusLabels,
                datasets: [{
                    label: 'Events',
                    data: statusData,
                    backgroundColor: [
                        '#16a34a', '#d97706', '#2563eb', '#dc2626'
                    ],
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: { beginAtZero: true, ticks: { stepSize: 1 } }
                }
            }
        });
    }

    // Recent registrations table
    const tbody = document.getElementById('recentRegistrationsTable');
    if (tbody) {
        tbody.innerHTML = recent_registrations.map(r => `
            <tr>
                <td>${r.student_name}</td>
                <td>${r.event_title}</td>
                <td>${formatDateTime(r.registration_date)}</td>
            </tr>
        `).join('');
    }

    // Load category chart
    loadOverallAnalytics();
}

// ============================================
// Load Event-Specific Analytics
// ============================================
async function loadEventAnalytics(eventId) {
    const result = await apiRequest(`/analytics/event/${eventId}`);

    if (!result.success) return;

    const { statistics, gender_distribution, course_distribution,
            registration_timeline } = result.data;

    // Update stats
    document.getElementById('analyticRegistered').textContent =
        statistics.total_registered;
    document.getElementById('analyticPresent').textContent =
        statistics.total_present;
    document.getElementById('analyticAbsent').textContent =
        statistics.total_absent;
    document.getElementById('analyticRate').textContent =
        statistics.attendance_percentage + '%';

    // Gender Distribution Chart
    if (gender_distribution.length > 0) {
        destroyChart('genderChart');
        const genderCtx = document.getElementById('genderChart')?.getContext('2d');
        if (genderCtx) {
            chartInstances['genderChart'] = new Chart(genderCtx, {
                type: 'pie',
                data: {
                    labels: gender_distribution.map(g => g.gender || 'Unknown'),
                    datasets: [{
                        data: gender_distribution.map(g => g.count),
                        backgroundColor: ['#2563eb', '#ec4899', '#8b5cf6']
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { position: 'bottom' }
                    }
                }
            });
        }
    }

    // Course Distribution Chart
    if (course_distribution.length > 0) {
        destroyChart('courseChart');
        const courseCtx = document.getElementById('courseChart')?.getContext('2d');
        if (courseCtx) {
            chartInstances['courseChart'] = new Chart(courseCtx, {
                type: 'doughnut',
                data: {
                    labels: course_distribution.map(c => c.course || 'Unknown'),
                    datasets: [{
                        data: course_distribution.map(c => c.count),
                        backgroundColor: [
                            '#2563eb', '#16a34a', '#d97706',
                            '#dc2626', '#8b5cf6', '#0891b2',
                            '#db2777', '#65a30d'
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { position: 'bottom' }
                    }
                }
            });
        }
    }

    // Registration Timeline Chart
    if (registration_timeline.length > 0) {
        destroyChart('timelineChart');
        const timelineCtx = document.getElementById('timelineChart')?.getContext('2d');
        if (timelineCtx) {
            chartInstances['timelineChart'] = new Chart(timelineCtx, {
                type: 'line',
                data: {
                    labels: registration_timeline.map(
                        t => formatDate(t.reg_date)
                    ),
                    datasets: [{
                        label: 'Registrations',
                        data: registration_timeline.map(t => t.count),
                        borderColor: '#2563eb',
                        backgroundColor: 'rgba(37, 99, 235, 0.1)',
                        fill: true,
                        tension: 0.4,
                        pointRadius: 5,
                        pointBackgroundColor: '#2563eb'
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: { stepSize: 1 }
                        }
                    }
                }
            });
        }
    }
}

// ============================================
// Load Overall Analytics (Admin)
// ============================================
async function loadOverallAnalytics() {
    const result = await apiRequest('/analytics/overall');

    if (!result.success) return;

    const { popular_events, category_distribution,
            monthly_event_trend, registration_trend } = result.data;

    // Category Distribution Chart (on dashboard)
    if (category_distribution.length > 0) {
        destroyChart('categoryChart');
        const catCtx = document.getElementById('categoryChart')?.getContext('2d');
        if (catCtx) {
            chartInstances['categoryChart'] = new Chart(catCtx, {
                type: 'pie',
                data: {
                    labels: category_distribution.map(c => c.category),
                    datasets: [{
                        data: category_distribution.map(c => c.count),
                        backgroundColor: [
                            '#2563eb', '#16a34a', '#d97706',
                            '#dc2626', '#8b5cf6', '#0891b2', '#64748b'
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { position: 'bottom' }
                    }
                }
            });
        }
    }

    // Popular Events Table
    const popularTable = document.getElementById('popularEventsTable');
    if (popularTable) {
        popularTable.innerHTML = popular_events.map((e, i) => `
            <tr>
                <td>
                    <strong style="color: ${i < 3 ? 'var(--warning)' : 'var(--text-primary)'}">
                        ${i < 3 ? '🏆' : ''} #${i + 1}
                    </strong>
                </td>
                <td><strong>${e.title}</strong></td>
                <td>${e.category}</td>
                <td>${e.current_participants} / ${e.max_participants}</td>
                <td>${e.attendees || 0}</td>
                <td>
                    <span class="badge ${
                        (e.attendance_rate || 0) >= 80 ? 'status-upcoming' :
                        (e.attendance_rate || 0) >= 50 ? 'status-ongoing' :
                        'status-cancelled'
                    }">
                        ${e.attendance_rate || 0}%
                    </span>
                </td>
            </tr>
        `).join('');
    }

    // Monthly Trend Chart
    if (monthly_event_trend.length > 0) {
        destroyChart('monthlyTrendChart');
        const monthCtx = document.getElementById('monthlyTrendChart')?.getContext('2d');
        if (monthCtx) {
            chartInstances['monthlyTrendChart'] = new Chart(monthCtx, {
                type: 'bar',
                data: {
                    labels: monthly_event_trend.map(m => m.month),
                    datasets: [{
                        label: 'Events',
                        data: monthly_event_trend.map(m => m.event_count),
                        backgroundColor: '#2563eb',
                        borderRadius: 8
                    }]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: { stepSize: 1 }
                        }
                    }
                }
            });
        }
    }

    // Registration Trend Chart
    if (registration_trend.length > 0) {
        destroyChart('regTrendChart');
        const regCtx = document.getElementById('regTrendChart')?.getContext('2d');
        if (regCtx) {
            chartInstances['regTrendChart'] = new Chart(regCtx, {
                type: 'line',
                data: {
                    labels: registration_trend.map(r => r.month),
                    datasets: [{
                        label: 'Registrations',
                        data: registration_trend.map(r => r.registration_count),
                        borderColor: '#16a34a',
                        backgroundColor: 'rgba(22, 163, 74, 0.1)',
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: { stepSize: 1 }
                        }
                    }
                }
            });
        }
    }
}