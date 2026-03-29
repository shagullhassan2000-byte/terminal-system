// Active Trips JS v3 — shows trip_code, cancel button, capacity

const API = '/api';
const kurdishDays   = ['یەکشەممە','دووشەممە','سێشەممە','چوارشەممە','پێنجشەممە','هەینی','شەممە'];
const kurdishMonths = ['جنواری','فیبروری','مارچ','ئاپریل','مەی','جوون','جولای','ئاگوست','سێپتەمبەر','ئۆکتۆبەر','نۆڤەمبەر','دیسەمبەر'];

function updateClock() {
    const now = new Date();
    const el = document.getElementById('clock');
    if (el) el.textContent = String(now.getHours()).padStart(2,'0')+':'+String(now.getMinutes()).padStart(2,'0')+':'+String(now.getSeconds()).padStart(2,'0');
    const dateEl = document.getElementById('today-date');
    if (dateEl) dateEl.textContent = kurdishDays[now.getDay()]+'  ·  '+now.getDate()+' '+kurdishMonths[now.getMonth()]+' '+now.getFullYear();
}

function formatIQD(a) { if (!a||isNaN(a)) return '0 IQD'; return Number(a).toLocaleString('en-US')+' IQD'; }
function formatTime(s) { if (!s) return '---'; const d=new Date(s); return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0'); }

function typeBadge(t) {
    if (t==='City Taxi')     return '<span class="type-badge city-taxi">🟡 تاکسی</span>';
    if (t==='Short Distance') return '<span class="type-badge long-dist">🔵  نۆتۆمبێلی ناوەخۆ</span>';
    if (t==='Bus')           return '<span class="type-badge bus">🟢 پاس</span>';
    return t;
}

async function loadActiveTrips() {
    try {
        const res  = await apiFetch(API+'/trips/active');
        const data = await res.json();
        const tbody = document.getElementById('trips-body');
        if (!data.success) { tbody.innerHTML='<tr><td colspan="10" class="table-empty" style="color:#ef4444;">❌ error</td></tr>'; return; }
        if (!data.data.length) { tbody.innerHTML='<tr><td colspan="10" class="table-empty">هیچ گەشت]کی چالاک نیە</td></tr>'; return; }
        const user = sessionStorage.getItem('terminal_user') || 'system';
        tbody.innerHTML = data.data.map(trip => {
            const capInfo = trip.capacity_limit > 0
                ? `<span style="font-size:11px;color:${trip.passengers_count>=trip.capacity_limit?'#ef4444':'#4ade80'}">${trip.passengers_count}/${trip.capacity_limit}</span>`
                : trip.passengers_count;
            return `<tr>
                <td><strong style="color:#c9a227;font-size:13px;">${trip.trip_code||'#'+trip.id}</strong></td>
                <td>${typeBadge(trip.type)}</td>
                <td><strong>${trip.driver_name||'---'}</strong></td>
                <td style="color:#94a3b8;font-size:12px;">${trip.driver_car||'---'}</td>
                <td>${trip.route_from||''} ← ${trip.route_to||''}</td>
                <td style="text-align:center;">${capInfo}</td>
                <td style="color:#4ade80;">${formatIQD(trip.total_income)}</td>
                <td style="color:#94a3b8;">${formatTime(trip.start_time)}</td>
                <td>
                    <button onclick="completeTrip(${trip.id},'${user}')" class="btn-small btn-success">✅ تەواو</button>
                    <button onclick="showPassengers(${trip.id})" class="btn-small btn-info">👥 گەشتیاران</button>
                    <button onclick="printReceiptForTrip(${trip.id})" class="btn-small btn-print">🖨️ پسووڵە</button>
                    ${isAdmin() ? `<button onclick="cancelTrip(${trip.id},'${user}')" class="btn-small btn-warning">❌ هەڵوەشاندن</button>` : ''}
                </td>
            </tr>`;
        }).join('');
    } catch(err) {
        document.getElementById('trips-body').innerHTML='<tr><td colspan="10" class="table-empty" style="color:#475569;">بەکەند نیە</td></tr>';
    }
}

async function completeTrip(id,user) {
    if (!confirm('ئایا دڵنیایت کە ئەم گەشتە تەواودەکەیت؟')) return;
    try {
        const res=await apiFetch(API+'/trips/'+id+'/complete',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({completed_by:user})});
        const data=await res.json();
        if (data.success) { showNotif('گەشتە تەواو کرا ✅','success'); loadActiveTrips(); }
        else showNotif(data.error||'data error','error');
    } catch(err) { showNotif('system error','error'); }
}

async function cancelTrip(id,user) {
    if (!confirm('ئایا دڵنیایت کە ئەم گەشتە هەڵدەوەشێنیتەوە؟')) return;
    try {
        const res=await apiFetch(API+'/trips/'+id+'/cancel',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({cancelled_by:user})});
        const data=await res.json();
        if (data.success) { showNotif('گەشت هەڵوەشایەوە','warning'); loadActiveTrips(); }
        else showNotif(data.error||'data error','error');
    } catch(err) { showNotif('system error','error'); }
}

async function showPassengers(id) {
    try {
        const res=await apiFetch(API+'/passengers/trip/'+id);
        const data=await res.json();
        if (!data.success||!data.data.length) { alert('هیچ گەشتیارێک زیادنەکراوە'); return; }
        alert('گەشتیاران:\n\n'+data.data.map((p,i)=>(i+1)+'. '+p.name+(p.passport?' — '+p.passport:'')+(p.nationality?' ('+p.nationality+')':'')).join('\n'));
    } catch(err) { showNotif('SYSTEM ERROR','error'); }
}

async function printReceiptForTrip(id) {
    try {
        const [tr,pr]=await Promise.all([apiFetch(API+'/trips/'+id),apiFetch(API+'/passengers/trip/'+id)]);
        const td=await tr.json(); const pd=await pr.json();
        if (td.success&&pd.success) printReceipt(td.data,pd.data);
        else showNotif('printing error','error');
    } catch(err) { showNotif('system error','error'); }
}

function showNotif(msg,type) {
    const n=document.createElement('div'); n.className='notification notif-'+(type||'info'); n.textContent=msg;
    document.body.appendChild(n); setTimeout(()=>n.remove(),3500);
}

document.addEventListener('DOMContentLoaded',function(){
    updateClock(); setInterval(updateClock,1000);
    loadActiveTrips(); setInterval(loadActiveTrips,5000);
});
