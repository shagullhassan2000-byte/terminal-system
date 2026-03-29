// ============================================
// DRIVERS JS - UPGRADED
// + availability status display
// + filter by availability
// + admin-only add/delete
// ============================================
 
const API = '/api';
let allDrivers = [];
 
 
const typeLabel = { 'Taxi': '🟡 تاکسی', 'Short Distance': '🔵ئۆتۆمبێلی ناوەخۆ ', 'Bus': '🟢پاس' };
 
function availBadge(avail) {
    if (avail === 'available') return '<span class="avail-available">🟢 بەردەست</span>';
    if (avail === 'on_trip')   return '<span class="avail-on_trip">🔴 لە ڕێگایدایە</span>';
    return '<span class="avail-off_duty">⚫ دەرەوەی کار</span>';
}
 
async function loadDrivers() {
    try {
        const res  = await apiFetch(API + '/drivers');
        const data = await res.json();
        const tbody = document.getElementById('drivers-body');
 
        if (!data.success) {
            tbody.innerHTML = '<tr><td colspan="7" class="table-empty" style="color:#ef4444;">❌ error </td></tr>';
            return;
        }
 
        allDrivers = data.data || [];
        renderDrivers(allDrivers);
 
    } catch (err) {
        document.getElementById('drivers-body').innerHTML =
            '<tr><td colspan="7" class="table-empty" style="color:#475569;">بەکەند نیە</td></tr>';
    }
}
 
function renderDrivers(drivers) {
    const tbody   = document.getElementById('drivers-body');
    const isAdm   = typeof isAdmin === 'function' && isAdmin();
 
    if (!drivers.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="table-empty">هیچ شۆفێرێک نەدۆزرایەوە</td></tr>';
        return;
    }
 
    tbody.innerHTML = drivers.map(d => `
        <tr>
            <td>${d.id}</td>
            <td><strong>${d.name}</strong></td>
            <td>${d.phone}</td>
            <td>${d.car_number}</td>
            <td>${typeLabel[d.car_type] || d.car_type}</td>
            <td>${availBadge(d.availability || 'available')}</td>
            <td>
                <button onclick="openEdit(${d.id},'${esc(d.name)}','${esc(d.phone)}','${esc(d.car_number)}','${esc(d.car_type)}','${d.availability||'available'}')" class="btn-small btn-warning">✏️ دەستکاری</button>
                ${isAdm ? `<button onclick="deleteDriver(${d.id},'${esc(d.name)}')" class="btn-small btn-danger">🗑️سڕینەوە</button>` : ''}
            </td>
        </tr>
    `).join('');
}
 
function filterDrivers() {
    const q      = (document.getElementById('search-drivers').value  || '').toLowerCase();
    const avail  = (document.getElementById('filter-avail').value     || '');
 
    let filtered = allDrivers;
 
    if (q) {
        filtered = filtered.filter(d =>
            d.name.toLowerCase().includes(q) ||
            d.phone.toLowerCase().includes(q) ||
            d.car_number.toLowerCase().includes(q)
        );
    }
 
    if (avail) {
        filtered = filtered.filter(d => (d.availability || 'available') === avail);
    }
 
    renderDrivers(filtered);
}
 
async function addDriver() {
    const name  = document.getElementById('new-name').value.trim();
    const phone = document.getElementById('new-phone').value.trim();
    const car   = document.getElementById('new-car').value.trim();
    const type  = document.getElementById('new-type').value;
 
    if (!name || !phone || !car || !type) { showNotif('تکایە هەموو خانەکان پڕ بکەوە', 'warning'); return; }
 
    try {
        const res  = await apiFetch(API + '/drivers', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, phone, car_number: car, car_type: type })
        });
        const data = await res.json();
        if (data.success) { showNotif('شۆفێر زیادکرا ✅', 'success'); clearForm(); loadDrivers(); }
        else showNotif(data.error || 'data error', 'error');
    } catch (err) { showNotif('system error', 'error'); }
}
 
async function deleteDriver(driverId, name) {
    if (!confirm('ئایا دڵنیایت کە ' + name + ' بسڕیتەوە؟')) return;
    try {
        const res  = await apiFetch(API + '/drivers/' + driverId, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) { showNotif('شۆفێر سڕایەوە', 'success'); loadDrivers(); }
        else showNotif(data.error || 'data error', 'error');
    } catch (err) { showNotif(' system error', 'error'); }
}
 
function openEdit(id, name, phone, car, type, avail) {
    document.getElementById('edit-id').value    = id;
    document.getElementById('edit-name').value  = name;
    document.getElementById('edit-phone').value = phone;
    document.getElementById('edit-car').value   = car;
    document.getElementById('edit-type').value  = type;
    document.getElementById('edit-avail').value = avail || 'available';
    document.getElementById('edit-modal').classList.add('open');
}
 
function closeModal() {
    document.getElementById('edit-modal').classList.remove('open');
}
 
async function saveEdit() {
    const id    = document.getElementById('edit-id').value;
    const name  = document.getElementById('edit-name').value.trim();
    const phone = document.getElementById('edit-phone').value.trim();
    const car   = document.getElementById('edit-car').value.trim();
    const type  = document.getElementById('edit-type').value;
    const avail = document.getElementById('edit-avail').value;
 
    if (!name || !phone || !car) { showNotif('تکایە هەموو خانەکان پڕ بکەوە', 'warning'); return; }
 
    try {
        // Update driver info
        await apiFetch(API + '/drivers/' + id, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, phone, car_number: car, car_type: type })
        });
        // Update availability
        const res2 = await apiFetch(API + '/drivers/' + id + '/availability', {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ availability: avail })
        });
        const data = await res2.json();
        if (data.success) { showNotif('شۆفێر نوێکرایەوە ✅', 'success'); closeModal(); loadDrivers(); }
        else showNotif(data.error || 'data error', 'error');
    } catch (err) { showNotif('system error ', 'error'); }
}
 
function clearForm() {
    ['new-name','new-phone','new-car'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    document.getElementById('new-type').value = '';
    document.getElementById('new-name').focus();
}
 
function esc(str) { return String(str||'').replace(/'/g, "\\'"); }
 
function showNotif(msg, type) {
    const n = document.createElement('div');
    n.className = 'notification notif-' + (type||'info');
    n.textContent = msg;
    document.body.appendChild(n);
    setTimeout(() => n.remove(), 3500);
}
 
document.addEventListener('DOMContentLoaded', function() {
    loadDrivers();
    setInterval(loadDrivers, 10000); // refresh every 10s
 
    const modal = document.getElementById('edit-modal');
    if (modal) modal.addEventListener('click', function(e) { if (e.target === this) closeModal(); });
});
