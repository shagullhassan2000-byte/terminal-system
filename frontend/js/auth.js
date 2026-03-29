// ============================================
// AUTH.JS v8 — CLEAN PERMISSION SYSTEM
// Developer: Eng. Shagull
// ============================================
// ROLES:
//   admin → full control
//   staff → daily work only
//
// PERMISSION MAP:
//   admin  : all pages + delete + edit + reports + users + backup + logs
//   staff  : dashboard, new-trip, active-trips, history, drivers(view), passenger-search
// ============================================

(function () {
    // ── 1. Must be logged in ─────────────────
    if (sessionStorage.getItem('terminal_logged') !== 'true') {
        const inPages = window.location.pathname.includes('/pages/');
        window.location.href = inPages ? '../login.html' : 'login.html';
        return;
    }

    // ── 2. Page-level protection ─────────────
    // These pages: staff gets sent back to dashboard instantly
    const ADMIN_PAGES = [
        'index.html',
        'users.html',
        'backup.html',
        'activity-log.html',
        'reports.html',
        'driver-report.html'
    ];

    const role        = sessionStorage.getItem('terminal_role') || 'staff';
    const currentPage = window.location.pathname.split('/').pop();

    if (role !== 'admin' && ADMIN_PAGES.includes(currentPage)) {
        const inPages = window.location.pathname.includes('/pages/');
        window.location.href = inPages ? '../dashboard.html' : 'dashboard.html';
        return;
    }
})();

// ── Logout ────────────────────────────────────
function logout() {
    if (confirm('ئایا دڵنیایت کە دەچیتە دەرەوە؟')) {
        sessionStorage.clear();
        const inPages = window.location.pathname.includes('/pages/');
        window.location.href = inPages ? '../login.html' : 'login.html';
    }
}

// ── Helpers ───────────────────────────────────
function getCurrentUser() {
    return {
        username: sessionStorage.getItem('terminal_user') || '',
        role:     sessionStorage.getItem('terminal_role') || 'staff',
        name:     sessionStorage.getItem('terminal_name') || ''
    };
}

function isAdmin() {
    return sessionStorage.getItem('terminal_role') === 'admin';
}

// ── Auth headers for every API call ──────────
function authHeaders(extra) {
    return Object.assign({
        'Content-Type': 'application/json',
        'x-username':   sessionStorage.getItem('terminal_user') || '',
        'x-role':       sessionStorage.getItem('terminal_role') || 'staff'
    }, extra || {});
}

async function apiFetch(url, options) {
    options = options || {};
    options.headers = authHeaders(options.headers || {});
    return fetch(url, options);
}

// ── DOM Ready: apply role UI ──────────────────
document.addEventListener('DOMContentLoaded', function () {
    const user = getCurrentUser();

    // Role badge in navbar
    const userEl = document.getElementById('nav-user');
    if (userEl) {
        if (user.role === 'admin') {
            userEl.innerHTML =
                '<span style="background:rgba(212,175,55,0.15);color:#D4AF37;border:1px solid rgba(212,175,55,0.3);' +
                'padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;">👑 ئەدمین</span>' +
                ' <span style="color:#606060;font-size:12px;">' + (user.name || user.username) + '</span>';
        } else {
            userEl.innerHTML =
                '<span style="background:rgba(59,130,246,0.12);color:#60a5fa;border:1px solid rgba(59,130,246,0.25);' +
                'padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;">👤 ستاف</span>' +
                ' <span style="color:#606060;font-size:12px;">' + (user.name || user.username) + '</span>';
        }
    }

    // Clock
    const clockEl = document.getElementById('clock');
    if (clockEl) {
        function tick() {
            const now = new Date();
            clockEl.textContent =
                String(now.getHours()).padStart(2,'0') + ':' +
                String(now.getMinutes()).padStart(2,'0') + ':' +
                String(now.getSeconds()).padStart(2,'0');
        }
        tick();
        setInterval(tick, 1000);
    }

    // Hide admin-only elements for staff
    if (user.role !== 'admin') {
        document.querySelectorAll('[data-admin], .admin-only').forEach(el => {
            el.style.display = 'none';
        });
    }
});

// Export globals
window.authHeaders    = authHeaders;
window.apiFetch       = apiFetch;
window.isAdmin        = isAdmin;
window.getCurrentUser = getCurrentUser;


