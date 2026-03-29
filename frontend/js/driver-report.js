// ============================================
// DRIVER REPORT JS
// All trips for one driver with summary
// ============================================

const API = '/api';

const kurdishDays   = ['یەکشەممە','دووشەممە','سێشەممە','چوارشەممە','پێنجشەممە','هەینی','شەممە'];
const kurdishMonths = ['جنواری','فیبروری','مارچ','ئاپریل','مەی','جوون','جولای','ئاگوست','سێپتەمبەر','ئۆکتۆبەر','نۆڤەمبەر','دیسەمبەر'];

let suggestTimeout = null;

function updateClock() {
    const now = new Date();
    const el = document.getElementById('clock');
    if (el) el.textContent = String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0') + ':' + String(now.getSeconds()).padStart(2,'0');
}

function formatIQD(a) {
    if (!a || isNaN(a)) return '0 IQD';
    return Number(a).toLocaleString('en-US') + ' IQD';
}

function formatDate(isoStr) {
    if (!isoStr) return '---';
    const d = new Date(isoStr);
    return d.getDate() + '/' + String(d.getMonth()+1).padStart(2,'0') + '/' + d.getFullYear();
}

function typeBadge(type) {
    if (type === 'City Taxi')     return '<span class="type-badge city-taxi">🟡 تاکسی</span>';
    if (type === 'Short Distance') return '<span class="type-badge long-dist">🔵 ئۆتۆمبێلی ناوەخۆ</span>';
    if (type === 'Bus')           return '<span class="type-badge bus">🟢 پاس</span>';
    return type;
}

async function searchDriverSuggest(val) {
    clearTimeout(suggestTimeout);
    const box = document.getElementById('driver-suggest');
    if (!val || val.length < 2) { box.style.display = 'none'; return; }

    suggestTimeout = setTimeout(async () => {
        try {
            const res  = await apiFetch(API + '/drivers/search?q=' + encodeURIComponent(val));
            const data = await res.json();
            if (!data.success || !data.data.length) { box.style.display = 'none'; return; }

            box.innerHTML = data.data.map(d => `
                <div class="suggest-item" onclick="selectDriver('${escapeJs(d.name)}')">
                    <div class="driver-name">${d.name}</div>
                    <div class="driver-detail">${d.phone} | ${d.car_number}</div>
                </div>
            `).join('');
            box.style.display = 'block';
        } catch (e) { box.style.display = 'none'; }
    }, 280);
}

function selectDriver(name) {
    document.getElementById('driver-search').value = name;
    document.getElementById('driver-suggest').style.display = 'none';
    loadDriverReport();
}

document.addEventListener('click', function(e) {
    const box = document.getElementById('driver-suggest');
    if (box && !box.contains(e.target) && e.target.id !== 'driver-search') box.style.display = 'none';
});

async function loadDriverReport() {
    const name = document.getElementById('driver-search').value.trim();
    if (!name) { showNotif('ناوی شۆفێر بنووسە', 'warning'); return; }

    const tbody = document.getElementById('driver-trips-body');
    tbody.innerHTML = '<tr><td colspan="7" class="table-empty">⏳ داتا بارئەکرێت...</td></tr>';

    try {
        const res  = await apiFetch(API + '/reports/driver-name?name=' + encodeURIComponent(name));
        const data = await res.json();

        if (!data.success) { tbody.innerHTML = '<tr><td colspan="7" class="table-empty" style="color:#ef4444;">❌ error</td></tr>'; return; }

        const trips = data.data || [];

        if (trips.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="table-empty">هیچ گەشتێک نەدۆزرایەوە</td></tr>';
            document.getElementById('driver-summary').style.display = 'none';
            return;
        }

        // Calculate summary
        const totalTrips = trips.length;
        const totalPax   = trips.reduce((s, t) => s + (t.passengers_count||0), 0);
        const totalInc   = trips.reduce((s, t) => s + (t.total_income||0), 0);

        // Show summary card
        document.getElementById('driver-summary').style.display = 'block';
        document.getElementById('driver-title').textContent = '👤 ' + trips[0].driver_name + ' — ' + (trips[0].driver_phone || '') + ' — ' + (trips[0].driver_car || '');
        document.getElementById('sum-trips').textContent      = totalTrips;
        document.getElementById('sum-passengers').textContent  = totalPax;
        document.getElementById('sum-income').textContent      = formatIQD(totalInc);

        // Render trips
        tbody.innerHTML = trips.map(trip => `
            <tr>
                <td>${trip.id}</td>
                <td>${typeBadge(trip.type)}</td>
                <td>${trip.route_from || ''} ← ${trip.route_to || ''}</td>
                <td style="text-align:center;"><strong>${trip.passengers_count||0}</strong></td>
                <td style="color:#4ade80; font-weight:700;">${formatIQD(trip.total_income)}</td>
                <td style="color:#94a3b8;">${formatDate(trip.start_time)}</td>
                <td>${trip.status === 'active' ? '<span class="status-active">active</span>' : '<span class="status-completed">DONE!</span>'}</td>
            </tr>
        `).join('');

    } catch (err) {
        tbody.innerHTML = '<tr><td colspan="7" class="table-empty" style="color:#475569;">There is no Backend</td></tr>';
    }
}

function escapeJs(str) { return String(str||'').replace(/'/g, "\\'"); }

function showNotif(msg, type) {
    const n = document.createElement('div');
    n.className = 'notification notif-' + (type||'info');
    n.textContent = msg;
    document.body.appendChild(n);
    setTimeout(() => n.remove(), 3500);
}

document.addEventListener('DOMContentLoaded', function() {
    updateClock();
    setInterval(updateClock, 1000);
});
