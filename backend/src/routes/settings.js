// ============================================
// SETTINGS ROUTES FILE
// Receipt counter and system settings
// ============================================

const express = require('express');
const router = express.Router();
// Settings route lives in src/routes/ so needs to go up two levels to reach database/
const db = require('../../database/init');
const { requireAdmin, requireStaff } = require('../middleware/rbac');

// GET next receipt number and increment counter
router.get('/next-receipt', requireStaff, (req, res) => {
    // Atomic: increment in one SQL statement, then read back — no race condition
    db.run(
        "UPDATE settings SET value = CAST(CAST(value AS INTEGER) + 1 AS TEXT) WHERE key = 'receipt_counter'",
        function(err) {
            if (err) return res.json({ success: false, message: 'find num error     پسووڵە' });
            db.get('SELECT value FROM settings WHERE key = ?', ['receipt_counter'], (err, row) => {
                if (err) return res.json({ success: false, message: 'find num error پسووڵە' });
                res.json({ success: true, data: { receipt_number: parseInt(row ? row.value : 1) } });
            });
        }
    );
});

// GET current receipt number without incrementing
router.get('/receipt-counter', requireStaff, (req, res) => {
    db.get('SELECT value FROM settings WHERE key = ?', ['receipt_counter'], (err, row) => {
        if (err) return res.json({ success: false, message: 'system error' });
        res.json({ success: true, data: { receipt_number: parseInt(row ? row.value : 0) } });
    });
});

// RESET receipt counter
router.post('/reset-receipt', requireAdmin, (req, res) => {
    db.run('UPDATE settings SET value = ? WHERE key = ?', ['0', 'receipt_counter'], (err) => {
        if (err) return res.json({ success: false, message: 'system error' });
        res.json({ success: true, message: 'ژمارە پسووڵە ڕیسێت کرا' });
    });
});

module.exports = router;
