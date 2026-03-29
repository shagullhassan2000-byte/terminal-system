// ============================================
// PASSPORT SCAN JS v3 — FIXED
// ============================================

const API = '/api';
let scanBuffer   = '';
let scanTimeout  = null;
let scannedToday = [];

function updateClock() {
    const now = new Date();
    const el  = document.getElementById('clock');
    if (el) el.textContent =
        String(now.getHours()).padStart(2,'0') + ':' +
        String(now.getMinutes()).padStart(2,'0') + ':' +
        String(now.getSeconds()).padStart(2,'0');
}

function safeSet(id, prop, val) {
    const el = document.getElementById(id);
    if (!el) return;
    if (prop === 'text') el.textContent = val;
    else if (prop === 'borderColor') el.style.borderColor = val;
    else if (prop === 'addClass') el.classList.add(val);
}

function focusScanner() {
    const input = document.getElementById('scanner-input');
    if (input) {
        input.focus();
        safeSet('scan-box', 'addClass', 'active');
        safeSet('scan-icon', 'text', '🟢');
        safeSet('scan-status', 'text', 'چاوەڕوانی سکان... پاسپۆرت بخشێنە بە سکانەر');
    }
}

function handleScan(value) {
    clearTimeout(scanTimeout);
    scanTimeout = setTimeout(() => {
        if (value && value.length > 10) {
            processMRZ(value);
            const inp = document.getElementById('scanner-input');
            if (inp) inp.value = '';
        }
    }, 300);
}

function processMRZ(raw) {
    const cleaned = raw.replace(/\r/g, '').trim();
    const lines   = cleaned.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    let parsed = { name: '', passport: '', nationality: '', dob: '', expiry: '', gender: '' };
    try {
        if (lines.length >= 2) {
            const L1 = lines[0].padEnd(44, '<');
            const L2 = lines[1].padEnd(44, '<');
            if (L1.startsWith('P')) {
                const namePart  = L1.substring(5, 44);
                const nameSplit = namePart.split('<<');
                const surname   = (nameSplit[0] || '').replace(/</g, ' ').trim();
                const given     = nameSplit.length > 1 ? nameSplit[1].replace(/</g, ' ').trim() : '';
                parsed.name        = (given + ' ' + surname).trim();
                parsed.nationality = L1.substring(2, 5).replace(/</g, '');
            }
            parsed.passport = L2.substring(0, 9).replace(/</g, '').trim();
            const dob6      = L2.substring(13, 19);
            const exp6      = L2.substring(21, 27);
            parsed.gender   = L2[20] === 'M' ? 'M - نێر' : L2[20] === 'F' ? 'F - مێ' : L2[20];
            parsed.dob      = formatMRZDate(dob6, true);
            parsed.expiry   = formatMRZDate(exp6, false);
        } else if (lines.length === 1 && lines[0].length > 20) {
            const match = lines[0].match(/[A-Z0-9]{6,9}/);
            if (match) parsed.passport = match[0];
            parsed.name = lines[0].replace(/</g, ' ').trim();
        }
    } catch (e) { console.error('MRZ parse error:', e); }
    const rawEl = document.getElementById('mrz-raw');
    if (rawEl) { rawEl.textContent = cleaned; rawEl.style.display = 'block'; }
    fillPassportForm(parsed);
    showNotif('✅ پاسپۆرت سکانکرا', 'success');
}

function formatMRZDate(yymmdd, isBirth) {
    if (!yymmdd || yymmdd.length !== 6) return '';
    const yy = parseInt(yymmdd.substring(0, 2));
    const mm = yymmdd.substring(2, 4);
    const dd = yymmdd.substring(4, 6);
    const currentYY = new Date().getFullYear() % 100;
    const yyyy = isBirth
        ? (yy > currentYY ? '19' : '20') + String(yy).padStart(2,'0')
        : '20' + String(yy).padStart(2,'0');
    return yyyy + '-' + mm + '-' + dd;
}

function fillPassportForm(data) {
    const fields = { 'p-name': data.name, 'p-passport': data.passport, 'p-nationality': data.nationality, 'p-dob': data.dob, 'p-expiry': data.expiry, 'p-gender': data.gender };
    Object.entries(fields).forEach(([id, val]) => {
        const el = document.getElementById(id);
        if (el) el.value = val || '';
    });
    const card = document.getElementById('passport-card');
    if (card) { card.classList.add('show'); card.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
}

function fillFromManual() {
    const name = document.getElementById('m-name').value.trim();
    if (!name) { showNotif('ناوی گەشتیار پێویستە', 'warning'); return; }
    fillPassportForm({
        name,
        passport:    document.getElementById('m-passport').value.trim(),
        nationality: document.getElementById('m-nationality').value.trim(),
        dob:         document.getElementById('m-dob').value.trim(),
        expiry:      '',
        gender:      ''
    });
    showNotif('✅ زانیاری داخلکرا', 'success');
}

function savePassenger() {
    const name = document.getElementById('p-name').value.trim();
    if (!name) { showNotif('ناوی گەشتیار پێویستە', 'warning'); return; }
    const record = {
        name,
        passport:    document.getElementById('p-passport').value.trim(),
        nationality: document.getElementById('p-nationality').value.trim(),
        dob:         document.getElementById('p-dob').value.trim(),
        expiry:      document.getElementById('p-expiry').value.trim(),
        gender:      document.getElementById('p-gender').value.trim(),
        time:        new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
        date:        new Date().toISOString().split('T')[0]
    };
    scannedToday.push(record);
    renderScanned();
    showNotif('✅ گەشتیار پاشەکەوتکرا', 'success');
    clearForm();
}

function renderScanned() {
    const tbody = document.getElementById('scanned-body');
    if (!scannedToday.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="table-empty">هیچ گەشتیارێک تۆمار نەکراوە</td></tr>';
        return;
    }
    tbody.innerHTML = scannedToday.map((p, i) => `
        <tr>
            <td>${i + 1}</td>
            <td><strong>${p.name}</strong></td>
            <td style="font-family:monospace;color:#94a3b8;">${p.passport || '---'}</td>
            <td>${p.nationality || '---'}</td>
            <td style="color:#64748b;font-size:12px;">${p.dob || '---'}</td>
            <td style="color:#64748b;font-size:12px;">${p.time}</td>
        </tr>
    `).join('');
}

function loadScanned() { renderScanned(); }

function clearForm() {
    ['p-name','p-passport','p-nationality','p-dob','p-expiry','p-gender'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    const card = document.getElementById('passport-card');
    if (card) card.classList.remove('show');
    const rawEl = document.getElementById('mrz-raw');
    if (rawEl) rawEl.style.display = 'none';
}

function printPassport() {
    const name   = document.getElementById('p-name').value;
    const pass   = document.getElementById('p-passport').value;
    const nat    = document.getElementById('p-nationality').value;
    const dob    = document.getElementById('p-dob').value;
    const expiry = document.getElementById('p-expiry').value;
    const gender = document.getElementById('p-gender').value;
    const w = window.open('', '_blank', 'width=400,height=300');
    w.document.write(`<html dir="rtl"><body style="font-family:Arial;padding:20px;direction:rtl">
        <h3>🪪 زانیاری پاسپۆرت</h3>
        <p><b>ناو:</b> ${name}</p>
        <p><b>پاسپۆرت:</b> ${pass}</p>
        <p><b>وڵات:</b> ${nat}</p>
        <p><b>بەرواری لەدایکبوون:</b> ${dob}</p>
        <p><b>کۆتایی:</b> ${expiry}</p>
        <p><b>ڕەگەز:</b> ${gender}</p>
        <p style="color:#999;font-size:12px;">کات: ${new Date().toLocaleString()}</p>
        <script>window.print();window.close();<\/script>
    </body></html>`);
}

function showNotif(msg, type) {
    const n = document.createElement('div');
    n.className = 'notification notif-' + (type || 'info');
    n.textContent = msg;
    document.body.appendChild(n);
    setTimeout(() => n.remove(), 3500);
}

document.addEventListener('DOMContentLoaded', function () {
    updateClock();
    setInterval(updateClock, 1000);
});
