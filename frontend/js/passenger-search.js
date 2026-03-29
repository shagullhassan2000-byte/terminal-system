// ============================================
// PASSENGER SEARCH JS
// Global search across all trips
// ============================================

const API = '/api';
let searchTimeout = null;

function updateClock() {
    const now = new Date();
    const el = document.getElementById('clock');
    if (el) el.textContent =
        String(now.getHours()).padStart(2,'0') + ':' +
        String(now.getMinutes()).padStart(2,'0') + ':' +
        String(now.getSeconds()).padStart(2,'0');
}

function typeBadge(type) {
    if (type === 'City Taxi')     return '<span class="type-badge city-taxi">🟡 تاکسی</span>';
    if (type === 'Short Distance') return '<span class="type-badge long-dist">🔵ئۆتۆمبێلی ناوەخۆ</span>';
    if (type === 'Bus')           return '<span class="type-badge bus">🟢 پاس</span>';
    return type;
}

function formatDate(isoStr) {
    if (!isoStr) return '---';
    const d = new Date(isoStr);
    return d.getDate() + '/' + String(d.getMonth()+1).padStart(2,'0') + '/' + d.getFullYear();
}

function searchPassengers(val) {
    clearTimeout(searchTimeout);
    const tbody     = document.getElementById('results-body');
    const countEl   = document.getElementById('result-count');

    if (!val || val.trim().length < 2) {
        tbody.innerHTML = '<tr><td colspan="8" class="table-empty"> لە ٢ پیت کەمتر نەبێ   بۆ گەڕان</td></tr>';
        countEl.textContent = '';
        return;
    }

    tbody.innerHTML = '<tr><td colspan="8" class="table-empty">⏳ گەڕان...</td></tr>';

    searchTimeout = setTimeout(async () => {
        try {
            const res  = await apiFetch(API + '/passengers/search?q=' + encodeURIComponent(val.trim()));
            const data = await res.json();

            if (!data.success) {
                tbody.innerHTML = '<tr><td colspan="8" class="table-empty" style="color:#ef4444;">❌ error</td></tr>';
                return;
            }

            const results = data.data || [];
            countEl.textContent = results.length > 0
                ? '✅ ' + results.length + ' گەشتیار دۆزرایەوە'
                : '❌ هیچ گەشتیارێک نەدۆزرایەوە';

            if (results.length === 0) {
                tbody.innerHTML = '<tr><td colspan="8" class="table-empty">هیچ گەشتیارێک نەدۆزرایەوە بۆ: "' + val + '"</td></tr>';
                return;
            }

            tbody.innerHTML = results.map(p => `
                <tr>
                    <td>${p.id}</td>
                    <td><strong style="color:#e2e8f0;">${p.name}</strong></td>
                    <td style="font-family:monospace; color:#94a3b8;">${p.passport || '---'}</td>
                    <td>${p.nationality || '---'}</td>
                    <td>${typeBadge(p.type)}</td>
                    <td>${p.driver_name || '---'}</td>
                    <td>${(p.route_from||'')} ← ${(p.route_to||'')}</td>
                    <td style="color:#94a3b8;">${formatDate(p.start_time)}</td>
                </tr>
            `).join('');

        } catch (err) {
            tbody.innerHTML = '<tr><td colspan="8" class="table-empty" style="color:#475569;">بەکەند نیە</td></tr>';
        }
    }, 400);
}

function clearSearch() {
    document.getElementById('search-input').value = '';
    document.getElementById('results-body').innerHTML = '<tr><td colspan="8" class="table-empty">ناو یان پاسپۆرت بنووسە بۆ گەڕان</td></tr>';
    document.getElementById('result-count').textContent = '';
    document.getElementById('search-input').focus();
}

document.addEventListener('DOMContentLoaded', function() {
    updateClock();
    setInterval(updateClock, 1000);
    document.getElementById('search-input').focus();
});
