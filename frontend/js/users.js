// ============================================
// USERS.JS — admin only
// Manage users, roles, passwords
// ============================================

const API = '/api';

function updateClock() {
    const now = new Date();
    const el = document.getElementById('clock');
    if (el) el.textContent =
        String(now.getHours()).padStart(2,'0') + ':' +
        String(now.getMinutes()).padStart(2,'0') + ':' +
        String(now.getSeconds()).padStart(2,'0');
}

function formatDateTime(isoStr) {
    if (!isoStr) return '---';
    const d = new Date(isoStr);
    return d.getDate() + '/' + String(d.getMonth()+1).padStart(2,'0') + '/' + d.getFullYear() +
        ' ' + String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
}

async function loadUsers() {
    try {
        const res  = await apiFetch(API + '/auth/users');
        const data = await res.json();
        const tbody = document.getElementById('users-body');

        if (!data.success) {
            tbody.innerHTML = '<tr><td colspan="7" class="table-empty" style="color:#ef4444;">❌ error </td></tr>';
            return;
        }

        if (!data.data.length) {
            tbody.innerHTML = '<tr><td colspan="7" class="table-empty">هیچ بەکارهێنەرێک نیە</td></tr>';
            return;
        }

        const currentUser = sessionStorage.getItem('terminal_user');

        tbody.innerHTML = data.data.map(u => {
            const roleBadge = u.role === 'admin'
                ? '<span class="role-admin">👑 ئەدمین</span>'
                : '<span class="role-staff">👤 ستاف</span>';

            const statusBadge = u.active
                ? '<span class="status-on">✅ چالاک</span>'
                : '<span class="status-off">❌ چالاک نیە</span>';

            const isSelf = u.username === currentUser;

            return `
                <tr>
                    <td>${u.id}</td>
                    <td><strong>${u.username}</strong> ${isSelf ? '<small style="color:#c9a227">(تۆ)</small>' : ''}</td>
                    <td>${u.full_name || '---'}</td>
                    <td>${roleBadge}</td>
                    <td>${statusBadge}</td>
                    <td style="color:#94a3b8; font-size:13px;">${formatDateTime(u.last_login)}</td>
                    <td>
                        <button onclick="openPasswordModal(${u.id})" class="btn-small btn-warning">🔑 وشەی نهێنی</button>
                        ${!isSelf ? `<button onclick="toggleUser(${u.id})" class="btn-small btn-info">${u.active ? '🔒 چالاک نیە' : '🔓 چالاک'}</button>` : ''}
                        ${!isSelf && u.username !== 'admin' ? `<button onclick="deleteUser(${u.id}, '${u.username}')" class="btn-small btn-danger">🗑️ سڕ</button>` : ''}
                    </td>
                </tr>
            `;
        }).join('');

    } catch (err) {
        document.getElementById('users-body').innerHTML =
            '<tr><td colspan="7" class="table-empty" style="color:#475569;">بەکەند نیە</td></tr>';
    }
}

async function addUser() {
    const username  = document.getElementById('new-username').value.trim().toLowerCase();
    const password  = document.getElementById('new-password').value;
    const full_name = document.getElementById('new-fullname').value.trim();
    const role      = document.getElementById('new-role').value;

    if (!username || !password) { showNotif('ناو و وشەی نهێنی پێویستە', 'warning'); return; }
    if (password.length < 4)    { showNotif('وشەی نهێنی کەمی ٤ پیت پێویستە', 'warning'); return; }

    try {
        const res  = await apiFetch(API + '/auth/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, role, full_name })
        });
        const data = await res.json();

        if (data.success) {
            showNotif('بەکارهێنەر زیادکرا ✅', 'success');
            document.getElementById('new-username').value  = '';
            document.getElementById('new-password').value  = '';
            document.getElementById('new-fullname').value  = '';
            document.getElementById('new-role').value      = 'staff';
            loadUsers();
        } else {
            showNotif(data.error || 'data.error', 'error');
        }
    } catch (err) { showNotif('system error ', 'error'); }
}

async function toggleUser(userId) {
    try {
        const res  = await apiFetch(API + '/auth/users/' + userId + '/toggle', { method: 'PUT' });
        const data = await res.json();
        if (data.success) { showNotif('دۆخ گۆڕا ✅', 'success'); loadUsers(); }
        else showNotif(data.error || 'data error ', 'error');
    } catch (err) { showNotif('system error', 'error'); }
}

async function deleteUser(userId, username) {
    if (!confirm('ئایا دڵنیایت کە ' + username + ' ببسڕێتەوە؟')) return;
    try {
        const res  = await apiFetch(API + '/auth/users/' + userId, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) { showNotif('بەکارهێنەر سڕایەوە', 'success'); loadUsers(); }
        else showNotif(data.error || 'data erreo', 'error');
    } catch (err) { showNotif(' system error', 'error'); }
}

function openPasswordModal(userId) {
    document.getElementById('pwd-user-id').value = userId;
    document.getElementById('new-pwd').value     = '';
    document.getElementById('pwd-modal').classList.add('open');
    setTimeout(() => document.getElementById('new-pwd').focus(), 100);
}

function closeModal() {
    document.getElementById('pwd-modal').classList.remove('open');
}

async function savePassword() {
    const userId  = document.getElementById('pwd-user-id').value;
    const newPwd  = document.getElementById('new-pwd').value;

    if (!newPwd || newPwd.length < 4) { showNotif('وشەی نهێنی کەمی ٤ پیت پێویستە', 'warning'); return; }

    try {
        const res  = await apiFetch(API + '/auth/users/' + userId + '/password', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ new_password: newPwd })
        });
        const data = await res.json();
        if (data.success) { showNotif('وشەی نهێنی نوێکرایەوە ✅', 'success'); closeModal(); }
        else showNotif(data.error || 'data error', 'error');
    } catch (err) { showNotif('system error ', 'error'); }
}

document.addEventListener('DOMContentLoaded', function() {
    updateClock();
    setInterval(updateClock, 1000);
    loadUsers();

    document.getElementById('pwd-modal').addEventListener('click', function(e) {
        if (e.target === this) closeModal();
    });
});

function showNotif(msg, type) {
    const n = document.createElement('div');
    n.className = 'notification notif-' + (type || 'info');
    n.textContent = msg;
    document.body.appendChild(n);
    setTimeout(() => n.remove(), 3500);
}
