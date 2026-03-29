// ============================================
// HISTORY JS — with search, filter, delete
// ============================================

const API = '/api';

const kurdishDays   = ['یەکشەممە','دووشەممە','سێشەممە','چوارشەممە','پێنجشەممە','هەینی','شەممە'];
const kurdishMonths = ['جنواری','فیبروری','مارچ','ئاپریل','مەی','جوون','جولای','ئاگوست','سێپتەمبەر','ئۆکتۆبەر','نۆڤەمبەر','دیسەمبەر'];

let allTrips = []; // store all for filtering


function formatIQD(amount) {
    if (!amount || isNaN(amount)) return '0 IQD';
    return Number(amount).toLocaleString('en-US') + ' IQD';
}

function formatDate(isoStr) {
    if (!isoStr) return '---';
    const d = new Date(isoStr);
    return d.getDate() + '/' + String(d.getMonth()+1).padStart(2,'0') + '/' + d.getFullYear();
}

function getDateOnly(isoStr) {
    if (!isoStr) return '';
    return new Date(isoStr).toISOString().split('T')[0];
}

function typeBadge(type) {
    if (type === 'City Taxi')     return '<span class="type-badge city-taxi">🟡 تاکسی</span>';
    if (type === 'Short Distance') return '<span class="type-badge long-dist">🔵  ئۆتۆمبێلی ناوەخۆ</span>';
    if (type === 'Bus')           return '<span class="type-badge bus">🟢 پاس</span>';
    return type;
}

async function loadHistory() {
    try {
        const res  = await apiFetch(API + '/trips/history');
        const data = await res.json();
        const tbody = document.getElementById('history-body');

        if (!data.success) {
            tbody.innerHTML = '<tr><td colspan="8" class="table-empty" style="color:#ef4444;">❌data errorا</td></tr>';
            return;
        }

        allTrips = data.data || [];
        renderTable(allTrips);

    } catch (err) {
        document.getElementById('history-body').innerHTML =
            '<tr><td colspan="8" class="table-empty" style="color:#475569;">بەکەند نیە</td></tr>';
    }
}

function renderTable(trips) {
    const tbody = document.getElementById('history-body');

    if (trips.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="table-empty">هیچ گەشتێک نەدۆزرایەوە' +
            ' &nbsp;<button onclick="clearFilters()" class="btn-small btn-outline" style="margin-right:8px;">↩ پاككردنەوەی فلتەر</button>' +
            '</td></tr>';
        return;
    }

    tbody.innerHTML = trips.map(trip => `
        <tr>
            <td><span style="font-family:monospace;font-size:11px;color:#c9a227;">${trip.trip_code||'#'+trip.id}</span></td>
            <td>${typeBadge(trip.type)}</td>
            <td><strong>${trip.driver_name || '---'}</strong></td>
            <td>${trip.route_from || ''} ← ${trip.route_to || ''}</td>
            <td style="text-align:center;"><strong>${trip.passengers_count || 0}</strong></td>
            <td style="color:#4ade80; font-weight:700;">${formatIQD(trip.total_income)}</td>
            <td style="color:#94a3b8;">${formatDate(trip.end_time)}</td>
            <td>
                <button onclick="showPassengers(${trip.id})" class="btn-small btn-info">👥 گەشتیاران</button>
                <button onclick="printReceiptForTrip(${trip.id})" class="btn-small btn-print">🖨️ پسووڵە</button>
                ${isAdmin() ? `<button onclick="deleteTrip(${trip.id})" class="btn-small btn-danger">🗑️ سڕینەوە</button>` : ""}
            </td>
        </tr>
    `).join('');
}

function filterHistory() {
    const searchVal  = (document.getElementById('search-input').value || '').toLowerCase();
    const dateFilter = document.getElementById('filter-date').value;

    let filtered = allTrips;

    if (searchVal) {
        filtered = filtered.filter(t =>
            (t.driver_name || '').toLowerCase().includes(searchVal) ||
            (t.route_from  || '').toLowerCase().includes(searchVal) ||
            (t.route_to    || '').toLowerCase().includes(searchVal) ||
            (t.type        || '').toLowerCase().includes(searchVal) ||
            String(t.id).includes(searchVal)
        );
    }

    if (dateFilter) {
        filtered = filtered.filter(t => getDateOnly(t.end_time) === dateFilter);
    }

    renderTable(filtered);
}

function clearFilters() {
    document.getElementById('search-input').value = '';
    document.getElementById('filter-date').value  = '';
    renderTable(allTrips);
}

async function showPassengers(tripId) {
    try {
        const res  = await apiFetch(API + '/passengers/trip/' + tripId);
        const data = await res.json();
        if (!data.success || data.data.length === 0) { alert('هیچ گەشتیارێک تۆمارنەکراوە'); return; }
        const list = data.data.map((p, i) => (i+1) + '. ' + p.name + (p.passport ? ' — ' + p.passport : '') + (p.nationality ? ' (' + p.nationality + ')' : '')).join('\n');
        alert('ڕۆیشتنی گەشتیاران  #' + tripId + ':\n\n' + list);
    } catch (err) { showNotif('system error', 'error'); }
}

async function printReceiptForTrip(tripId) {
    try {
        const [tripRes, pasRes] = await Promise.all([apiFetch(API + '/trips/' + tripId), apiFetch(API + '/passengers/trip/' + tripId)]);
        const tripData = await tripRes.json();
        const pasData  = await pasRes.json();
        if (tripData.success && pasData.success) printReceipt(tripData.data, pasData.data);
        else showNotif('printing error', 'error');
    } catch (err) { showNotif('system error', 'error'); }
}

async function deleteTrip(tripId) {
    if (!confirm('ئایا دڵنیایت  #' + tripId + ' بسڕێتەوە؟؟\nئەم کارە گەڕانەوەی نیە!')) return;
    try {
        const res  = await apiFetch(API + '/trips/' + tripId, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
            showNotif('ڕۆیشتن سڕایەوە', 'success');
            allTrips = allTrips.filter(t => t.id !== tripId);
            filterHistory();
        } else {
            showNotif(data.error || 'delet error', 'error');
        }
    } catch (err) { showNotif('system error', 'error'); }
}

function showNotif(msg, type) {
    const n = document.createElement('div');
    n.className = 'notification notif-' + (type || 'info');
    n.textContent = msg;
    document.body.appendChild(n);
    setTimeout(() => n.remove(), 3500);
}

document.addEventListener('DOMContentLoaded', function() {
    // Default date filter to today so staff see today's trips immediately
    const today = new Date();
    const todayStr = today.getFullYear() + '-' +
        String(today.getMonth()+1).padStart(2,'0') + '-' +
        String(today.getDate()).padStart(2,'0');
    const dateEl = document.getElementById('filter-date');
    if (dateEl) dateEl.value = todayStr;
    loadHistory();
});
