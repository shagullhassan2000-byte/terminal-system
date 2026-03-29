// ============================================
// NEW TRIP JS
// + capacity limit display and enforcement
// + driver availability status shown
// + created_by tracking
// + passport scanner integration
// ============================================

const API = '/api';

const CAPACITY = { 'City Taxi':9, 'Short Distance': 9, 'Bus': 50 };
let scanTimeout = null;

function focusPassportScanner() {
    const input = document.getElementById('scan-bar-input');
    if (input) {
        input.focus();
        document.getElementById('scan-bar').style.borderColor = '#4ade80';
        document.getElementById('scan-bar').style.background  = 'rgba(74,222,128,0.05)';
    }
}

function handlePassportScan(value) {
    clearTimeout(scanTimeout);
    scanTimeout = setTimeout(() => {
        if (!value || value.length < 10) return;
        const cleaned = value.replace(/\r/g, '').trim();
        const lines   = cleaned.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        let name = '', passport = '', nationality = '';
        try {
            if (lines.length >= 2) {
                const L1 = lines[0].padEnd(44, '<');
                const L2 = lines[1].padEnd(44, '<');
                if (L1.startsWith('P')) {
                    const namePart  = L1.substring(5, 44).split('<<');
                    const surname   = (namePart[0] || '').replace(/</g, ' ').trim();
                    const given     = namePart[1] ? namePart[1].replace(/</g, ' ').trim() : '';
                    name        = (given + ' ' + surname).trim();
                    nationality = L1.substring(2, 5).replace(/</g, '');
                }
                passport = L2.substring(0, 9).replace(/</g, '').trim();
            } else {
                name = cleaned.replace(/</g, ' ').trim();
            }
        } catch(e) {}
        document.getElementById('pax-name').value        = name;
        document.getElementById('pax-passport').value    = passport;
        document.getElementById('pax-nationality').value = nationality;
        document.getElementById('scan-bar-input').value = '';
        document.getElementById('scan-bar').style.borderColor = '#c9a227';
        document.getElementById('scan-bar').style.background  = '';
        showNotif('✅ پاسپۆرت سکانکرا — زانیاری پڕبووەتەوە', 'success');
    }, 300);
}

let selectedType   = '';
let currentTripId  = null;
let capacityLimit  = 0;
let passengers     = [];
let suggestTimeout = null;

function setType(btn, type) {
    selectedType  = type;
    capacityLimit = CAPACITY[type] || 0;

    document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');

    const titles = { 'City Taxi': '🟡 تاکسی ', 'Short Distance': '🔵 ئۆتۆمبێلی ناوەخۆ  ', 'Bus': '🟢 پاس' };
    document.getElementById('form-title').textContent = titles[type];

    const capEl = document.getElementById('capacity-info');
    if (capEl) capEl.textContent = '👥 زۆرینەی گەشتیاران: ' + capacityLimit + ' کەس';

    document.getElementById('trip-form').style.display = 'block';
    document.getElementById('trip-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function searchDriver(val) {
    clearTimeout(suggestTimeout);
    const box = document.getElementById('driver-suggest');
    if (!val || val.length < 2) { box.style.display = 'none'; return; }

    suggestTimeout = setTimeout(async () => {
        try {
            const res  = await apiFetch(API + '/drivers/search?q=' + encodeURIComponent(val));
            const data = await res.json();
            if (!data.success || !data.data.length) { box.style.display = 'none'; return; }

            box.innerHTML = data.data.map(d => {
                const isOnTrip = d.availability === 'on_trip';
                const availBadge = isOnTrip
                    ? '<span style="color:#ef4444; font-size:11px;">🔴 لە ڕێگایدایە</span>'
                    : '<span style="color:#4ade80; font-size:11px;">🟢 بەردەستە</span>';

                return `<div class="suggest-item ${isOnTrip ? 'driver-busy' : ''}"
                    onclick="${isOnTrip ? '' : "selectDriver(" + d.id + ",'" + esc(d.name) + "','" + esc(d.phone) + "','" + esc(d.car_number) + "','" + esc(d.car_type) + "')" }"
                    style="${isOnTrip ? 'opacity:0.5; cursor:not-allowed;' : ''}">
                    <div class="driver-name">${d.name} &nbsp; ${availBadge}</div>
                    <div class="driver-detail">${d.phone} &nbsp;|&nbsp; ${d.car_number} (${d.car_type})</div>
                </div>`;
            }).join('');

            box.style.display = 'block';
        } catch (e) { box.style.display = 'none'; }
    }, 280);
}

function selectDriver(id, name, phone, car, carType) {
    document.getElementById('driver-id').value    = id;
    document.getElementById('driver-name').value  = name;
    document.getElementById('driver-phone').value = phone;
    document.getElementById('driver-car').value   = car;
    document.getElementById('driver-suggest').style.display = 'none';
}

document.addEventListener('click', function(e) {
    const box = document.getElementById('driver-suggest');
    if (box && !box.contains(e.target) && e.target.id !== 'driver-name') box.style.display = 'none';
    // Refocus scanner bar if passenger section is active and click wasn't on a form input
    const pasSection = document.getElementById('passenger-section');
    const scanInput  = document.getElementById('scan-bar-input');
    const formTags   = ['INPUT','SELECT','TEXTAREA','BUTTON','A'];
    if (pasSection && pasSection.style.display !== 'none' &&
        scanInput && !formTags.includes(e.target.tagName)) {
        scanInput.focus();
    }
});

function esc(str) { return String(str||'').replace(/'/g,"\'").replace(/"/g,'&quot;'); }

async function startTrip() {
    if (!selectedType) { showNotif('جۆری ڕۆیشتن دیاری بکە', 'warning'); return; }

    const name   = document.getElementById('driver-name').value.trim();
    const phone  = document.getElementById('driver-phone').value.trim();
    const car    = document.getElementById('driver-car').value.trim();
    const from   = document.getElementById('route-from').value.trim();
    const to     = document.getElementById('route-to').value.trim();
    const fare   = parseFloat(document.getElementById('fare').value) || 0;
    const drivId = document.getElementById('driver-id').value || null;
    const user   = sessionStorage.getItem('terminal_user') || 'staff';

    if (!name || !from || !to) { showNotif('ناوی شۆفێر، لە کوێ، و بۆ کوێ داواکراوە', 'warning'); return; }

    if (!drivId && name && phone && car) {
        const save = confirm('ئەم شۆفێرە نوێیە. سەیڤی دەکەیت؟\n' + name + ' — ' + phone + ' — ' + car);
        if (save) {
            try {
                await apiFetch(API + '/drivers', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, phone, car_number: car, car_type: selectedType === 'Bus' ? 'Bus' : 'Taxi' })
                });
            } catch (e) {}
        }
    }

    try {
        const res  = await apiFetch(API + '/trips', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: selectedType, driver_id: drivId, driver_name: name,
                driver_phone: phone, driver_car: car, route_from: from,
                route_to: to, fare_per_person: fare,
                capacity_limit: capacityLimit, created_by: user
            })
        });
        const data = await res.json();

        if (!data.success) {
            showNotif(data.error || 'data error', 'error');
            return;
        }

        currentTripId = data.data.id;
        capacityLimit = data.data.capacity_limit || CAPACITY[selectedType] || 0;
        passengers    = [];

        showNotif('ڕۆیشتن دەستی پێکرد ✅  #' + currentTripId + ' — سنووری گەشتیار: ' + capacityLimit, 'success');

        const infoLabel = document.getElementById('trip-info-label');
        if (infoLabel) infoLabel.textContent = '(#' + currentTripId + ' — ' + from + ' → ' + to + ' — زۆرینە: ' + capacityLimit + ' کەس)';

        document.getElementById('trip-form').style.display = 'none';
        document.getElementById('passenger-section').style.display = 'block';

        if (selectedType === 'Bus') {
            document.getElementById('bus-bulk').style.display    = 'block';
            document.getElementById('single-passenger').style.display = 'none';
        } else {
            document.getElementById('bus-bulk').style.display    = 'none';
            document.getElementById('single-passenger').style.display = 'block';
        }

        document.getElementById('passenger-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
        updatePassengerCount();

    } catch (err) { showNotif('system error', 'error'); }
}

async function addPassenger() {
    if (!currentTripId) { showNotif('یەکەم گەشت دەست پێبکە', 'warning'); return; }

    if (capacityLimit > 0 && passengers.length >= capacityLimit) {
        showNotif('❌ گەیشتیتە سنووری زۆرینە — ' + capacityLimit + ' کەس', 'error');
        return;
    }

    const name        = document.getElementById('pax-name').value.trim();
    const passport    = document.getElementById('pax-passport').value.trim();
    const nationality = document.getElementById('pax-nationality').value.trim();

    if (!name) { showNotif('ناوی گەشتیار پێویستە', 'warning'); return; }

    try {
        const res  = await apiFetch(API + '/passengers', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ trip_id: currentTripId, name, passport, nationality })
        });
        const data = await res.json();

        if (!data.success) {
            showNotif(data.error || 'data error', 'error');
            return;
        }

        passengers.push({ name, passport, nationality });
        document.getElementById('pax-name').value        = '';
        document.getElementById('pax-passport').value    = '';
        document.getElementById('pax-nationality').value = '';
        document.getElementById('pax-name').focus();

        renderPassengerList();
        updatePassengerCount();
        showNotif('گەشتیار زیادکرا ✅ (' + passengers.length + '/' + capacityLimit + ')', 'success');

    } catch (err) { showNotif('system error', 'error'); }
}

async function addBulkPassengers() {
    if (!currentTripId) { showNotif(' یەکەم گەشت  دەست پێبکە', 'warning'); return; }

    const text = document.getElementById('bulk-text').value.trim();
    if (!text) { showNotif('لیستی گەشتیاران بنووسە', 'warning'); return; }

    const lines  = text.split('\n').filter(l => l.trim());
    const parsed = lines.map(line => {
        const parts = line.split('-').map(p => p.trim());
        return { name: parts[0]||'', passport: parts[1]||'', nationality: parts[2]||'' };
    }).filter(p => p.name);

    if (!parsed.length) { showNotif('هیچ گەشتیارێکی دروست نیە', 'warning'); return; }

    if (capacityLimit > 0 && parsed.length > capacityLimit) {
        showNotif('❌ ' + parsed.length + ' کەس زیادترە لە سنووری ' + capacityLimit + ' کەس', 'error');
        return;
    }

    try {
        const res  = await apiFetch(API + '/passengers/bulk', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ trip_id: currentTripId, passengers: parsed })
        });
        const data = await res.json();

        if (!data.success) { showNotif(data.error || ' data error', 'error'); return; }

        passengers = parsed;
        document.getElementById('bulk-text').value = '';
        renderPassengerList();
        updatePassengerCount();
        showNotif(parsed.length + ' گەشتیار زیادکردن ✅', 'success');

    } catch (err) { showNotif('', 'error'); }
}

function renderPassengerList() {
    const list = document.getElementById('passenger-list');
    if (!passengers.length) { list.innerHTML = ''; return; }
    list.innerHTML = passengers.map((p, i) => `
        <div class="passenger-item">
            <div class="pax-num">${i + 1}</div>
            <div class="pax-info">
                <strong>${p.name}</strong>
                ${p.passport ? ' &nbsp;—&nbsp; <small style="color:#64748b">' + p.passport + '</small>' : ''}
                ${p.nationality ? ' &nbsp;(<small style="color:#64748b">' + p.nationality + '</small>)' : ''}
            </div>
        </div>
    `).join('');
}

function updatePassengerCount() {
    const el = document.getElementById('passenger-count');
    if (!el) return;
    const ratio = capacityLimit > 0 ? passengers.length + '/' + capacityLimit : passengers.length;
    const color = capacityLimit > 0 && passengers.length >= capacityLimit ? '#ef4444' : '#c9a227';
    el.textContent = 'کۆی گەشتیاران: ' + ratio;
    el.style.borderColor = color;
    el.style.color = color;
}

async function finishTrip() {
    if (!currentTripId) return;
    if (!confirm('ئایا گەشت تەواو دەکەیت؟\nژمارەی گەشتیاران: ' + passengers.length)) return;

    const user = sessionStorage.getItem('terminal_user') || 'staff';

    try {
        const res  = await apiFetch(API + '/trips/' + currentTripId + '/complete', {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ completed_by: user })
        });
        const data = await res.json();

        if (data.success) {
            showNotif('گەشت تەواو کرا ✅', 'success');
            const savedId = currentTripId;
            setTimeout(() => { if (confirm('ئایا پسووڵە چاپ دەکەیت؟')) printReceiptById(savedId); }, 400);
            setTimeout(resetAll, 1500);
        } else { showNotif(data.message||'data error', 'error'); }
    } catch (err) { showNotif('system error', 'error'); }
}

async function printReceiptById(tripId) {
    try {
        const [tripRes, pasRes] = await Promise.all([
            apiFetch(API + '/trips/' + tripId),
            apiFetch(API + '/passengers/trip/' + tripId)
        ]);
        const tripData = await tripRes.json();
        const pasData  = await pasRes.json();
        if (tripData.success && pasData.success) printReceipt(tripData.data, pasData.data);
    } catch (err) { console.error(err); }
}

function resetAll() {
    selectedType = ''; currentTripId = null; capacityLimit = 0; passengers = [];
    document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('selected'));
    document.getElementById('trip-form').style.display        = 'none';
    document.getElementById('passenger-section').style.display = 'none';
    ['driver-id','driver-name','driver-phone','driver-car','route-from','route-to','fare'].forEach(id => {
        const el = document.getElementById(id); if (el) el.value = '';
    });
    document.getElementById('passenger-list').innerHTML = '';
    const lbl = document.getElementById('trip-info-label');
    if (lbl) lbl.textContent = '';
}

function showNotif(msg, type) {
    const n = document.createElement('div');
    n.className = 'notification notif-' + (type||'info');
    n.textContent = msg;
    document.body.appendChild(n);
    setTimeout(() => n.remove(), 3500);
}

document.addEventListener('DOMContentLoaded', function() {
});
