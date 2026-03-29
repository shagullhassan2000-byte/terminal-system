// ============================================
// ACTIVITY LOG JS
// Shows all system actions
// ============================================

const API = '/api';
let allLogs = [];

function formatDateTime(isoStr) {
    if (!isoStr) return '---';
    const d = new Date(isoStr);
    return d.getDate() + '/' + String(d.getMonth()+1).padStart(2,'0') + '/' + d.getFullYear() +
        '  ' + String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0') + ':' + String(d.getSeconds()).padStart(2,'0');
}

function actionBadge(action) {
    const map = {
        'LOGIN':          { color: '#4ade80',  icon: '🔓', label: 'چوونەژوورەوە' },
        'LOGIN_FAILED':   { color: '#ef4444',  icon: '❌', label: 'هەڵەی چوونەژوورەوە' },
        'TRIP_CREATED':   { color: '#60a5fa',  icon: '🚗', label: ' گەشتی نوێ
 دروستکرا' },
        'TRIP_COMPLETED': { color: '#c9a227',  icon: '✅', label: 'گەشت تەواوکرا' },
        'TRIP_DELETED':   { color: '#f87171',  icon: '🗑️', label: 'گەشت سڕایەوە' },
        'TRIP_CANCELLED': { color: '#fb923c',  icon: '❌', label: 'گەشت هەڵوەشایەوە' },
        'TRIP_UPDATED':   { color: '#fb923c',  icon: '✏️', label: 'گەشت نوێکرایەوە' },
        'DRIVER_ADDED':   { color: '#34d399',  icon: '➕', label: 'شۆفێری نوێ زیادکرا' },
        'DRIVER_UPDATED': { color: '#a3e635',  icon: '✏️', label: 'شۆفێر نوێکرایەوە' },
        'DRIVER_DELETED': { color: '#f87171',  icon: '🗑️', label: 'شۆفێر سڕایەوە' },
        'AUTO_BACKUP':    { color: '#a78bfa',  icon: '💾', label: 'باکئەپی ئۆتۆماتیک' },
    };
    const info = map[action] || { color: '#94a3b8', icon: '📋', label: action };
    return `<span style="color:${info.color}; font-weight:700;">${info.icon} ${info.label}</span>`;
}

async function loadLog() {
    try {
        const res  = await apiFetch(API + '/auth/log?limit=500');
        const data = await res.json();
        const tbody = document.getElementById('log-body');

        if (!data.success) {
            tbody.innerHTML = '<tr><td colspan="5" class="table-empty" style="color:#ef4444;">❌ error</td></tr>';
            return;
        }

        allLogs = data.data || [];
        renderLog(allLogs);

    } catch (err) {
        document.getElementById('log-body').innerHTML =
            '<tr><td colspan="5" class="table-empty" style="color:#475569;">بەکەند نیە</td></tr>';
    }
}

function renderLog(logs) {
    const tbody = document.getElementById('log-body');
    if (!logs.length) {
        tbody.innerHTML = '<tr><td colspan="5" class="table-empty">هیچ تۆمارێک نیە</td></tr>';
        return;
    }

    tbody.innerHTML = logs.map(log => `
        <tr>
            <td>${log.id}</td>
            <td><strong style="color:#c9a227;">${log.username}</strong></td>
            <td>${actionBadge(log.action)}</td>
            <td style="color:#94a3b8; font-size:13px;">${log.details || '---'}</td>
            <td style="color:#64748b; font-size:12px; font-family:monospace;">${formatDateTime(log.created_at)}</td>
        </tr>
    `).join('');
}

function filterLog() {
    const userFilter   = (document.getElementById('filter-user').value   || '').toLowerCase();
    const actionFilter = (document.getElementById('filter-action').value || '');

    let filtered = allLogs;
    if (userFilter)   filtered = filtered.filter(l => l.username.toLowerCase().includes(userFilter));
    if (actionFilter) filtered = filtered.filter(l => l.action === actionFilter);

    renderLog(filtered);
}

function clearFilter() {
    document.getElementById('filter-user').value   = '';
    document.getElementById('filter-action').value = '';
    renderLog(allLogs);
}

function showNotif(msg, type) {
    const n = document.createElement('div');
    n.className = 'notification notif-' + (type || 'info');
    n.textContent = msg;
    document.body.appendChild(n);
    setTimeout(() => n.remove(), 3500);
}

document.addEventListener('DOMContentLoaded', function() {
    loadLog();
});
