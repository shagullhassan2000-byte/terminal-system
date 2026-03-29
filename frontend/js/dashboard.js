// ============================================
// DASHBOARD JS 
// - Stat cards with live refresh
// - Chart.js: trips, income, passengers (7 days)
// - Driver availability summary
// ============================================

const API = '/api';
const kurdishDays   = ['یەکشەممە','دووشەممە','سێشەممە','چوارشەممە','پێنجشەممە','هەینی','شەممە'];
const kurdishMonths = ['جنواری','فیبروری','مارچ','ئاپریل','مەی','جوون','جولای','ئاگوست','سێپتەمبەر','ئۆکتۆبەر','نۆڤەمبەر','دیسەمبەر'];

let tripsChart = null, incomeChart = null;

function updateClock() {
    const now = new Date();
    const el = document.getElementById('clock');
    if (el) el.textContent = String(now.getHours()).padStart(2,'0')+':'+String(now.getMinutes()).padStart(2,'0')+':'+String(now.getSeconds()).padStart(2,'0');
    const dateEl = document.getElementById('today-date');
    if (dateEl) {
        const day = kurdishDays[now.getDay()];
        const month = kurdishMonths[now.getMonth()];
        dateEl.textContent = day + '  ·  ' + now.getDate() + ' ' + month + ' ' + now.getFullYear();
    }
}

function formatIQD(a) { return !a||isNaN(a) ? '0 IQD' : Number(a).toLocaleString('en-US')+' IQD'; }
function setText(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }

async function loadStats() {
    try {
        const res  = await apiFetch(API + '/dashboard/stats');
        const data = await res.json();
        if (!data.success) return;
        const s = data.data;
        setText('ct-trips',      s.cityTaxi.trips      || 0);
        setText('ct-passengers', s.cityTaxi.passengers || 0);
        setText('ct-income',     formatIQD(s.cityTaxi.income));
        setText('ct-active',     s.cityTaxi.active     || 0);
        setText('ld-trips',      s.longDistance.trips      || 0);
        setText('ld-passengers', s.longDistance.passengers || 0);
        setText('ld-income',     formatIQD(s.longDistance.income));
        setText('ld-active',     s.longDistance.active     || 0);
        setText('bs-trips',      s.bus.trips      || 0);
        setText('bs-passengers', s.bus.passengers || 0);
        setText('bs-income',     formatIQD(s.bus.income));
        setText('bs-active',     s.bus.active     || 0);
        setText('tot-trips',      s.total.trips      || 0);
        setText('tot-passengers', s.total.passengers || 0);
        setText('tot-income',     formatIQD(s.total.income));
        setText('tot-active',     s.total.active     || 0);
    } catch(err) { console.error('Stats error:', err); }
}

async function loadCharts() {
    try {
        const res  = await apiFetch(API + '/dashboard/chart?days=7');
        const data = await res.json();
        if (!data.success) return;
        const { labels, trips, passengers, income } = data.data;

        const chartDefaults = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { labels: { color: '#94a3b8', font: { family: 'Segoe UI' } } } },
            scales: {
                x: { ticks: { color: '#64748b' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                y: { ticks: { color: '#64748b' }, grid: { color: 'rgba(255,255,255,0.05)' }, beginAtZero: true }
            }
        };

        const tc = document.getElementById('trips-chart');
        if (tc) {
            if (tripsChart) tripsChart.destroy();
            tripsChart = new Chart(tc.getContext('2d'), {
                type: 'bar',
                data: {
                    labels,
                    datasets: [
                        { label: 'گەشتەکان', data: trips,      backgroundColor: 'rgba(201,162,39,0.7)',  borderColor: '#c9a227', borderWidth: 1 },
                        { label: 'گەشتیاران',   data: passengers, backgroundColor: 'rgba(96,165,250,0.7)', borderColor: '#60a5fa', borderWidth: 1 }
                    ]
                },
                options: chartDefaults
            });
        }

        const ic = document.getElementById('income-chart');
        if (ic) {
            if (incomeChart) incomeChart.destroy();
            incomeChart = new Chart(ic.getContext('2d'), {
                type: 'line',
                data: {
                    labels,
                    datasets: [{
                        label: 'دراوەکان (IQD)',
                        data: income,
                        borderColor: '#4ade80',
                        backgroundColor: 'rgba(74,222,128,0.1)',
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: '#4ade80'
                    }]
                },
                options: chartDefaults
            });
        }
    } catch(err) { console.error('Chart error:', err); }
}

async function loadDriverSummary() {
    try {
        const res  = await apiFetch(API + '/dashboard/drivers');
        const data = await res.json();
        if (!data.success) return;
        const d = data.data;
        setText('drv-available', d.available || 0);
        setText('drv-on-trip',   d.on_trip   || 0);
        setText('drv-off-duty',  d.off_duty  || 0);
    } catch(err) {}
}

document.addEventListener('DOMContentLoaded', function() {
    updateClock();
    setInterval(updateClock, 1000);
    loadStats();
    loadCharts();
    loadDriverSummary();
    setInterval(() => { loadStats(); loadDriverSummary(); }, 5000);
    setInterval(loadCharts, 60000);
});
