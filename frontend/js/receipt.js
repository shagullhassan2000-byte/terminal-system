// ============================================
// RECEIPT.JS
// Prints 3 copies on A5 paper
// Yellow header = City Taxi
// Orange header = Short Distance / Bus
// ============================================

function printReceipt(trip, passengers) {

    // 10 rows minimum
    var rows = '';
    for (var i = 1; i <= 10; i++) {
        var p = passengers[i - 1] || { name: '', passport: '', nationality: '' };
        rows += '<tr>' +
            '<td style="width:30px;">' + i + '</td>' +
            '<td style="text-align:right; padding-right:6px;">' + (p.name || '') + '</td>' +
            '<td>' + (p.passport || '') + '</td>' +
            '<td>' + (p.nationality || '') + '</td>' +
            '</tr>';
    }

    var now     = new Date();
    var timeStr = String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0');
    var dateStr = now.getFullYear() + '/' + String(now.getMonth()+1).padStart(2,'0') + '/' + String(now.getDate()).padStart(2,'0');

    // Yellow for City Taxi, Orange for everything else
    var headerBg  = (trip.type === 'City Taxi') ? '#f59e0b' : '#ea580c';
    var subtitle  = (trip.type === 'City Taxi')
        ? 'پسووڵەی دەرچوونی تاکسی بۆ ناو حاجی ئۆمەران'
        : 'پسووڵەی دەرچوونی تاکسی بۆ هەموو شار و شارۆچکەکان';

    var style = '<style>' +
        '@page { size: A5; margin: 8mm; }' +
        'body { font-family: Arial, "Segoe UI", Tahoma, sans-serif; direction: rtl; font-size: 13px; margin: 0; padding: 0; background: white; color: #000; }' +
        '.receipt { border: 2px solid #000; background: white; page-break-inside: avoid; }' +
        '.header { background: ' + headerBg + '; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center; }' +
        '.company-name { font-size: 18px; font-weight: bold; color: white; text-shadow: 0 1px 2px rgba(0,0,0,0.3); }' +
        '.header-sub { color: rgba(255,255,255,0.9); font-size: 12px; margin-top: 3px; }' +
        '.phone-box { background: #1a1a2e; color: #FFD700; padding: 5px 12px; border-radius: 5px; font-size: 13px; font-weight: bold; text-align: center; }' +
        '.receipt-num { color: white; font-size: 13px; font-weight: bold; margin-top: 4px; text-align: center; background: rgba(0,0,0,0.2); padding: 2px 8px; border-radius: 4px; }' +
        '.body { padding: 10px 12px; }' +
        '.subtitle { background: #1a1a2e; color: #FFD700; text-align: center; padding: 7px; font-weight: bold; margin-bottom: 10px; border-radius: 4px; font-size: 14px; letter-spacing: 0.3px; }' +
        '.info-row { display: flex; justify-content: space-between; align-items: center; padding: 5px 0; border-bottom: 1px solid #e5e5e5; font-size: 13px; }' +
        '.info-row:last-of-type { border-bottom: none; margin-bottom: 8px; }' +
        'table { width: 100%; border-collapse: collapse; margin-top: 8px; }' +
        'th { background: #1a1a2e; color: #FFD700; font-weight: bold; padding: 7px 5px; text-align: center; font-size: 12px; border: 1px solid #000; }' +
        'td { border: 1px solid #000; padding: 5px 5px; text-align: center; font-size: 12px; height: 22px; }' +
        '.footer { text-align: center; margin-top: 8px; font-size: 11px; color: #666; padding-top: 6px; border-top: 1px solid #ddd; }' +
        '.page-break { page-break-after: always; height: 0; margin: 0; padding: 0; }' +
        '</style>';

    var card =
        '<div class="receipt">' +

        '<div class="header">' +
            '<div>' +
                '<div class="company-name">دەروازەی نێودەوڵەتی حاجی ئۆمەران</div>' +
                '<div class="header-sub">وێنەی بازگه &nbsp;|&nbsp; تێرمینال</div>' +
            '</div>' +
            '<div>' +
                '<div class="phone-box">0750 235 3448</div>' +
                '<div class="receipt-num">ژمارە : ' + (trip.trip_code || trip.receipt_number || trip.id) + '</div>' +
            '</div>' +
        '</div>' +

        '<div class="body">' +
            '<div class="subtitle">' + subtitle + '</div>' +

            '<div class="info-row">' +
                '<span>کات ( ' + timeStr + ' )</span>' +
                '<span>ڕێکەوت : ' + dateStr + '</span>' +
            '</div>' +

            '<div class="info-row">' +
                '<span>ناوی شۆفێر : <strong>' + (trip.driver_name || '') + '</strong></span>' +
            '</div>' +

            '<div class="info-row">' +
                '<span>ژمارەی ئۆتۆمبێل  : ' + (trip.driver_car || '') + '</span>' +
                '<span>ڕۆیشتنی بۆ : <strong>' + (trip.route_to || '') + '</strong></span>' +
            '</div>' +

            '<div class="info-row">' +
                '<span>ژ.م شۆفێر : ' + (trip.driver_phone || '') + '</span>' +
                '<span>بڕی پارە : <strong>' + Number(trip.total_income || 0).toLocaleString('en-US') + ' IQD</strong></span>' +
            '</div>' +

            '<table>' +
                '<thead><tr>' +
                    '<th>ژ</th>' +
                    '<th>ناوی گەشتیار</th>' +
                    '<th>ژ.پاسەپۆرت</th>' +
                    '<th>وڵاتنامە</th>' +
                '</tr></thead>' +
                '<tbody>' + rows + '</tbody>' +
            '</table>' +

            '<div class="footer">دەروازەی نێودەوڵەتی حاجی ئۆمەران &nbsp;·&nbsp; تێرمینال &nbsp;·&nbsp; 0750 235 3448</div>' +
        '</div>' +

        '</div>';

    var w = window.open('', '_blank');
    if (!w) { alert('تکایە pop-up بلۆک مەکە بۆ چاپکردن'); return; }

    w.document.write(
        '<!DOCTYPE html><html><head>' +
        '<meta charset="UTF-8">' +
        '<title>پسووڵە #' + (trip.trip_code || trip.receipt_number || trip.id) + '</title>' +
        style +
        '</head><body>' +
        card + '<div class="page-break"></div>' +
        card + '<div class="page-break"></div>' +
        card +
        '</body></html>'
    );
    w.document.close();
    setTimeout(function() { w.print(); }, 900);
}
