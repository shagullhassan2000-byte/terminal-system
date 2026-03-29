// ============================================
// BACKUP ROUTES v5
// Admin only: list, restore, manual backup
// ============================================

const express = require('express');
const router  = express.Router();
const path    = require('path');
const { requireAdmin } = require('../middleware/rbac');
const { saveBackup, listBackups, restoreBackup } = require('../utils/backup');
const db = require(path.join(__dirname, '../../database/init'));

// GET /api/backup/list — list all backups
router.get('/list', requireAdmin, (req, res) => {
    try {
        const backups = listBackups();
        res.json({ success: true, data: backups });
    } catch (err) {
        res.json({ success: false, error: err.message });
    }
});

// POST /api/backup/create — create manual backup
router.post('/create', requireAdmin, (req, res) => {
    try {
        const name = saveBackup('manual');
        db.run('INSERT INTO activity_log (username,action,details) VALUES (?,?,?)',
            [req.username, 'MANUAL_BACKUP', 'Backup created: ' + name]);
        res.json({ success: true, message: 'باکئەپ دروستکرا: ' + name, filename: name });
    } catch (err) {
        res.json({ success: false, error: err.message });
    }
});

// POST /api/backup/restore — restore from a backup
router.post('/restore', requireAdmin, (req, res) => {
    const { filename } = req.body;
    if (!filename) return res.json({ success: false, error: 'ناوی فایل پێویستە' });
    try {
        restoreBackup(filename);
        db.run('INSERT INTO activity_log (username,action,details) VALUES (?,?,?)',
            [req.username, 'DB_RESTORED', 'Restored from: ' + filename]);
        res.json({ success: true, message: '✅ دیتابەیس گەڕایەوە: ' + filename });
    } catch (err) {
        res.json({ success: false, error: err.message });
    }
});

module.exports = router;
