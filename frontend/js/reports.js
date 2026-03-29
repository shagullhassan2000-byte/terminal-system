// ============================================
// REPORTS JS v5
// - Daily report
// - Export trips CSV
// - Export passengers CSV
// - Database backup
// ============================================

const API = '/api';
const kurdishDays   = ['یەکشەممە','دووشەممە','سێشەممە','چوارشەممە','پێنجشەممە','هەینی','شەممە'];
const kurdishMonths = ['جنواری','فیبروری','مارچ','ئاپریل','مەی','جوون','جولای','ئاگوست','سێپتەمبەر','ئۆکتۆبەر','نۆڤەمبەر','دیسەمبەر'];
let currentReportData = null;

function formatIQD(a) { return !a||isNaN(a) ? '0 IQD' : Number(a).toLocaleString('en-US')+' IQD'; }

async function loadReport() {
    const dateInput = document.getElementById('report-date').value;
    if (!dateInput) { showNotif('تکایە بەرواری دیاری بکە','warning'); return; }
    const tbody = document.getElementById('report-body');
    tbody.innerHTML = '<tr><td colspan="4" class="table-empty">⏳ داتا بارئەکرێت...</td></tr>';
    const dateObj = new Date(dateInput+'T12:00:00');
    const titleEl = document.getElementById('report-date-title');
    if (titleEl) titleEl.textContent = 'ڕاپۆرتی '+kurdishDays[dateObj.getDay()]+'  ·  '+dateObj.getDate()+' '+kurdishMonths[dateObj.getMonth()]+' '+dateObj.getFullYear();
    try {
        const res = await apiFetch(API+'/reports/daily?date='+dateInput);
        const data = await res.json();
        if (!data.success) { tbody.innerHTML='<tr><td colspan="4" class="table-empty" style="color:#ef4444;">❌ error</td></tr>'; return; }
        const map={};(data.data||[]).forEach(r=>{map[r.type]=r;});
        const ct=map['City Taxi']||{trips:0,passengers:0,income:0};
        const ld=map['Short Distance']||{trips:0,passengers:0,income:0};
        const bus=map['Bus']||{trips:0,passengers:0,income:0};
        const tt=(ct.trips||0)+(ld.trips||0)+(bus.trips||0);
        const tp=(ct.passengers||0)+(ld.passengers||0)+(bus.passengers||0);
        const ti=(ct.income||0)+(ld.income||0)+(bus.income||0);
        currentReportData={ct,ld,bus,totalTrips:tt,totalPax:tp,totalInc:ti,date:dateInput};
        if (!tt) { tbody.innerHTML='<tr><td colspan="4" class="table-empty">ئەم ڕۆژە هیچ گەشتێک نیە</td></tr>'; return; }
        tbody.innerHTML=`
            <tr><td>🟡 تاکسی</td><td style="text-align:center;font-weight:700;">${ct.trips||0}</td><td style="text-align:center;font-weight:700;">${ct.passengers||0}</td><td style="color:#4ade80;font-weight:700;">${formatIQD(ct.income)}</td></tr>
            <tr><td>🔵ئۆتۆمبێلی ناوەخۆ</td><td style="text-align:center;font-weight:700;">${ld.trips||0}</td><td style="text-align:center;font-weight:700;">${ld.passengers||0}</td><td style="color:#4ade80;font-weight:700;">${formatIQD(ld.income)}</td></tr>
            <tr><td>🟢 پاس </td><td style="text-align:center;font-weight:700;">${bus.trips||0}</td><td style="text-align:center;font-weight:700;">${bus.passengers||0}</td><td style="color:#4ade80;font-weight:700;">${formatIQD(bus.income)}</td></tr>
            <tr style="background:rgba(201,162,39,0.08);border-top:2px solid #c9a227;"><td style="color:#c9a227;font-weight:800;">⭐ کۆی گشتی</td><td style="text-align:center;color:#c9a227;font-weight:800;font-size:16px;">${tt}</td><td style="text-align:center;color:#c9a227;font-weight:800;font-size:16px;">${tp}</td><td style="color:#c9a227;font-weight:800;">${formatIQD(ti)}</td></tr>`;
    } catch(err) { tbody.innerHTML='<tr><td colspan="4" class="table-empty" style="color:#475569;">بەکەند نیە</td></tr>'; }
}

function setTodayDate() {
    const today=new Date();
    document.getElementById('report-date').value=today.getFullYear()+'-'+String(today.getMonth()+1).padStart(2,'0')+'-'+String(today.getDate()).padStart(2,'0');
    loadReport();
}

function exportTripsCSV() {
    const dateInput = document.getElementById('report-date').value;
    if (!dateInput) { showNotif('تکایە بەرواری دیاری بکە','warning'); return; }
    apiFetch(API+'/export/trips?date='+dateInput)
        .then(r => r.blob())
        .then(blob => {
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'trips-'+dateInput+'.csv';
            a.click();
            URL.revokeObjectURL(a.href);
        }).catch(() => showNotif('download error','error'));
    showNotif('CSV داونلۆدئەکرێت...','info');
}

function exportPassengersCSV() {
    const dateInput = document.getElementById('report-date').value;
    if (!dateInput) { showNotif('تکایە بەرواری دیاری بکە','warning'); return; }
    apiFetch(API+'/export/passengers?date='+dateInput)
        .then(r => r.blob())
        .then(blob => {
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'passengers-'+dateInput+'.csv';
            a.click();
            URL.revokeObjectURL(a.href);
        }).catch(() => showNotif('download error','error'));
    showNotif('CSV گەشتیاران داونلۆدئەکرێت...','info');
}

function downloadBackup() {
    if (!confirm('باکئەپی دیتابەیس داونلۆد بکەیت؟')) return;
    apiFetch(API+'/reports/backup')
        .then(r => r.blob())
        .then(blob => {
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'terminal-backup-'+new Date().toISOString().split('T')[0]+'.db';
            a.click();
            URL.revokeObjectURL(a.href);
        }).catch(() => showNotif('download error','error'));
    showNotif('باکئەپ داونلۆدئەکرێت...','info');
}

function showNotif(msg,type) {
    const n=document.createElement('div');n.className='notification notif-'+(type||'info');n.textContent=msg;document.body.appendChild(n);setTimeout(()=>n.remove(),3500);
}

document.addEventListener('DOMContentLoaded',function(){
    setTodayDate();
});
