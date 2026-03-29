// ============================================
// REPORTS ROUTES - EXTENDED
// Daily report, driver report, Excel export
// ============================================

const express = require('express');
const router  = express.Router();
const path    = require('path');
const db      = require(path.join(__dirname, '../../database/init'));
const { requireStaff, requireAdmin } = require('../middleware/rbac');
const fs      = require('fs');

// GET daily report — returns array by type
router.get('/daily', requireStaff, (req, res) => {
    const date = req.query.date || new Date().toISOString().split('T')[0];
    db.all(
        "SELECT type, COUNT(*) as trips, SUM(passengers_count) as passengers, SUM(total_income) as income FROM trips WHERE DATE(start_time) = ? AND status != 'deleted' GROUP BY type",
        [date],
        (err, rows) => {
            if (err) return res.status(500).json({ success: false, error: err.message });
            res.json({ success: true, data: rows || [], date });
        }
    );
});

// GET driver report — all trips for one driver
router.get('/driver/:driverId', requireStaff, (req, res) => {
    db.all(
        "SELECT * FROM trips WHERE driver_id = ? AND status != 'deleted' ORDER BY start_time DESC",
        [req.params.driverId],
        (err, rows) => {
            if (err) return res.status(500).json({ success: false, error: err.message });
            res.json({ success: true, data: rows || [] });
        }
    );
});

// GET driver report by name (for drivers without saved ID)
router.get('/driver-name', requireStaff, (req, res) => {
    const name = req.query.name || '';
    db.all(
        "SELECT * FROM trips WHERE driver_name LIKE ? AND status != 'deleted' ORDER BY start_time DESC LIMIT 200",
        ['%' + name + '%'],
        (err, rows) => {
            if (err) return res.status(500).json({ success: false, error: err.message });
            res.json({ success: true, data: rows || [] });
        }
    );
});

// GET all trips for a date range (for export)
router.get('/export', requireStaff, (req, res) => {
    const date  = req.query.date  || new Date().toISOString().split('T')[0];
    const date2 = req.query.date2 || date;
    db.all(
        `SELECT t.id, t.type, t.driver_name, t.driver_phone, t.driver_car,
                t.route_from, t.route_to, t.passengers_count, t.fare_per_person,
                t.total_income, t.status, t.start_time, t.end_time
         FROM trips t
         WHERE DATE(t.start_time) BETWEEN ? AND ?
           AND t.status != 'deleted'
         ORDER BY t.id`,
        [date, date2],
        (err, rows) => {
            if (err) return res.status(500).json({ success: false, error: err.message });
            res.json({ success: true, data: rows || [], date, date2 });
        }
    );
});

// GET backup — returns database file (admin only)
router.get('/backup', requireAdmin, (req, res) => {
    const file = req.query.file;
    let dbPath, filename;
    if (file) {
        // Sanitize: only allow .db files with safe names
        const safe = file.replace(/[^a-zA-Z0-9\-_.]/g, '');
        dbPath   = path.join(__dirname, '../../database/backups', safe);
        filename = safe;
    } else {
        const today = new Date().toISOString().split('T')[0];
        dbPath   = path.join(__dirname, '../../database/terminal.db');
        filename = 'terminal-backup-' + today + '.db';
    }
    if (!fs.existsSync(dbPath)) return res.status(404).json({ success: false, error: 'فایل نەدۆزرایەوە' });
    res.download(dbPath, filename, (err) => {
        if (err && !res.headersSent) res.status(500).json({ success: false, error: 'Backup failed' });
    });
});

module.exports = router;
