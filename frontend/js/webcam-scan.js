// ============================================
// WEBCAM SCAN JS
// Uses Tesseract.js OCR to read passport MRZ
// Works with any USB webcam
// ============================================

let webcamStream = null;
let isScanning   = false;

// ── Mode switching ───────────────────────────
function switchMode(mode) {
    ['webcam','scanner','manual'].forEach(m => {
        document.getElementById('mode-' + m).style.display = m === mode ? 'block' : 'none';
        document.getElementById('tab-' + m).classList.toggle('active', m === mode);
    });
    if (mode !== 'webcam') stopWebcam();
    if (mode === 'scanner') setTimeout(focusScanner, 300);
}

// ── Webcam ───────────────────────────────────
async function startWebcam() {
    try {
        setStatus('📷 کامێرا دەکرێتەوە...', '#c9a227');
        webcamStream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'environment' }
        });
        const video = document.getElementById('webcam-video');
        video.srcObject = webcamStream;
        video.style.display = 'block';
        document.getElementById('scan-line').style.display = 'block';
        document.getElementById('btn-start').style.display   = 'none';
        document.getElementById('btn-capture').style.display = 'inline-block';
        document.getElementById('btn-stop').style.display    = 'inline-block';
        setStatus('✅ کامێرا ئامادەیە — پاسپۆرت بخەرە پێش کامێرا، MRZ لێرەدا بێت', '#4ade80');
    } catch (e) {
        setStatus('❌ کامێرا نەکرایەوە — مووچەڵەتی بدە یان دووبارە هەوڵ بدەرەوە', '#ef4444');
    }
}

async function captureAndScan() {
    if (!webcamStream || isScanning) return;
    isScanning = true;

    const video  = document.getElementById('webcam-video');
    const canvas = document.getElementById('webcam-canvas');
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);

    setStatus('⏳ OCR دەخوێنێتەوە... چەند چرکەیەک صەبر بکە', '#c9a227');

    try {
        const result = await Tesseract.recognize(canvas, 'eng', {
            tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<',
        });

        const text  = result.data.text.toUpperCase();
        const lines = text.split('\n').map(l => l.replace(/[^A-Z0-9<]/g, '').trim()).filter(l => l.length > 20);
        const mrzLines = lines.filter(l => l.includes('<'));

        if (mrzLines.length >= 2) {
            const mrzText = mrzLines.slice(0, 2).join('\n');
            document.getElementById('mrz-raw').textContent = mrzText;
            document.getElementById('mrz-raw').style.display = 'block';
            processMRZ(mrzText);
            setStatus('✅ پاسپۆرت سکانکرا — زانیاری پڕبووەتەوە!', '#4ade80');
        } else if (mrzLines.length === 1) {
            // Try single line (some passports)
            processMRZ(mrzLines[0]);
            setStatus('⚠️ یەک ڕیز دۆزرایەوە — دووبارە هەوڵ بدە یان دەستی پڕبکەرەوە', '#f59e0b');
        } else {
            setStatus('❌ MRZ نەدۆزرایەوە — پاسپۆرت نزیکتر بخەرە، ڕووناکی باش بێت', '#ef4444');
        }
    } catch (e) {
        setStatus('❌ سکان شکستی هێنا — دووبارە هەوڵ بدەرەوە', '#ef4444');
    }

    isScanning = false;
}

function stopWebcam() {
    if (webcamStream) {
        webcamStream.getTracks().forEach(t => t.stop());
        webcamStream = null;
    }
    const video = document.getElementById('webcam-video');
    if (video) {
        video.style.display = 'none';
        video.srcObject = null;
    }
    const scanLine = document.getElementById('scan-line');
    if (scanLine) scanLine.style.display = 'none';
    const btnStart   = document.getElementById('btn-start');
    const btnCapture = document.getElementById('btn-capture');
    const btnStop    = document.getElementById('btn-stop');
    if (btnStart)   btnStart.style.display   = 'inline-block';
    if (btnCapture) btnCapture.style.display = 'none';
    if (btnStop)    btnStop.style.display    = 'none';
    setStatus('▶️ کلیک بکە بۆ دەستپێکردنی کامێرا', '#94a3b8');
}

function setStatus(msg, color) {
    const el = document.getElementById('webcam-status');
    if (el) { el.textContent = msg; el.style.color = color || '#94a3b8'; }
}

// Stop webcam when leaving page
window.addEventListener('beforeunload', stopWebcam);
