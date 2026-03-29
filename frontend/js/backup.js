// ============================================
// BACKUP JS v5
// Admin-only: list, create, restore backups
// ============================================

const API = '/api';

function updateClock() {
    const now = new Date();
    const el = document.getElementById('clock');
    if (el) el.textContent = String(now.getHours()).padStart(2,'0')+':'+String(now.getMinutes()).padStart(2,'0')+':'+String(now.getSeconds()).padStart(2,'0');
}

async function loadBackups() {
    const tbody = document.getElementById('backup-body');
    tbody.innerHTML = '<tr><td colspan="4" class="table-empty">⏳ بارئەکرێت...</td></tr>';
    try {
        const res  = await apiFetch(API + '/backup/list');
        const data = await res.json();
        if (!data.success || !data.data.length) {
            tbody.innerHTML = '<tr><td colspan="4" class="table-empty">هیچ باکئەپێک نیە</td></tr>';
            return;
        }
        tbody.innerHTML = data.data.map(b => `
            <tr>
                <td style="font-family:monospace;font-size:12px;">${b.name}</td>
                <td style="color:#94a3b8;">${b.date}</td>
                <td style="color:#64748b;">${b.size}</td>
                <td>
                    <button onclick="restoreBackup('${b.name}')" class="btn-small btn-warning">♻️ گەڕاندنەوە</button>
                    <button onclick="downloadBackup('${b.name}')" class="btn-small btn-info">⬇️ داونلۆد</button>
                </td>
            </tr>
        `).join('');
    } catch(err) {
        tbody.innerHTML = '<tr><td colspan="4" class="table-empty" style="color:#ef4444;">There is no Backend</td></tr>';
    }
}

async function downloadBackup(filename) {
    try {
        const res = await apiFetch(API + '/backup/list'); // verify auth first
        showNotif('⏳ داونلۆد دەستپێکرد...', 'info');
        const r = await apiFetch(API + '/reports/backup?file=' + encodeURIComponent(filename));
        const blob = await r.blob();
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.click();
        URL.revokeObjectURL(a.href);
    } catch(err) { showNotif('❌ download error', 'error'); }
}

async function createBackup() {
    const resultEl = document.getElementById('create-result');
    resultEl.innerHTML = '<span style="color:#64748b;">⏳ دروستئەکرێت...</span>';
    try {
        const res  = await apiFetch(API + '/backup/create', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
            resultEl.innerHTML = '<span style="color:#4ade80;">✅ ' + data.message + '</span>';
            loadBackups();
        } else {
            resultEl.innerHTML = '<span style="color:#ef4444;">❌ ' + (data.error||'error') + '</span>';
        }
    } catch(err) {
        resultEl.innerHTML = '<span style="color:#ef4444;">❌ There is no Backend</span>';
    }
}

async function restoreBackup(filename) {
    if (!confirm('⚠️ ئایا دڵنیایت کە دیتابەیس بگەڕێنیتەوە؟\n\n' + filename + '\n\nدیتابەیسی ئێستا پاراستی دەبێت پێش گەڕاندنەوە.'))
        return;
    showNotif('⏳ گەڕاندنەوە دەستپێکرد...', 'info');
    try {
        const res  = await apiFetch(API + '/backup/restore', {
            method: 'POST',
            body: JSON.stringify({ filename })
        });
        const data = await res.json();
        if (data.success) {
            showNotif(data.message, 'success');
            loadBackups();
        } else {
            showNotif('❌ ' + (data.error||'error'), 'error');
        }
    } catch(err) {
        showNotif('❌ backend error', 'error');
    }
}

function showNotif(msg, type) {
    const n = document.createElement('div');
    n.className = 'notification notif-' + (type||'info');
    n.textContent = msg;
    document.body.appendChild(n);
    setTimeout(() => n.remove(), 4000);
}

document.addEventListener('DOMContentLoaded', function() {
    updateClock();
    setInterval(updateClock, 1000);
    loadBackups();
});
