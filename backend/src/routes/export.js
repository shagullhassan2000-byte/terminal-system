// ============================================
// EXPORT ROUTES v5
// CSV export for trips, passengers
// ============================================

const express = require('express');
const router  = express.Router();
const path    = require('path');
const { requireStaff } = require('../middleware/rbac');
const { exportTripsCSV, exportPassengersCSV } = require('../utils/export');
const db = require(path.join(__dirname, '../../database/init'));

// GET /api/export/trips?date=YYYY-MM-DD — export trips as CSV
router.get('/trips', requireStaff, (req, res) => {
    const date = req.query.date || new Date().toISOString().split('T')[0];
    db.all(
        `SELECT t.*, t.trip_code FROM trips t WHERE DATE(t.start_time) = ? AND t.status != 'deleted' ORDER BY t.id`,
        [date],
        (err, rows) => {
            if (err) return res.status(500).json({ success: false, error: err.message });
            const csv = exportTripsCSV(rows || []);
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', 'attachment; filename="trips-' + date + '.csv"');
            res.send(csv);
        }
    );
});

// GET /api/export/passengers?date=YYYY-MM-DD — export passengers as CSV
router.get('/passengers', requireStaff, (req, res) => {
    const date = req.query.date || new Date().toISOString().split('T')[0];
    db.all(
        `SELECT p.*, t.trip_code, t.type, t.driver_name, t.route_from, t.route_to, t.start_time
         FROM passengers p JOIN trips t ON p.trip_id = t.id
         WHERE DATE(t.start_time) = ? AND t.status != 'deleted' ORDER BY p.id`,
        [date],
        (err, rows) => {
            if (err) return res.status(500).json({ success: false, error: err.message });
            const csv = exportPassengersCSV(rows || []);
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', 'attachment; filename="passengers-' + date + '.csv"');
            res.send(csv);
        }
    );
});

// GET /api/export/driver?name=X — all trips for one driver
router.get('/driver', requireStaff, (req, res) => {
    const name = req.query.name || '';
    if (!name) return res.status(400).json({ success: false, error: 'ناوی شۆفێر پێویستە' });
    db.all(
        `SELECT * FROM trips WHERE driver_name LIKE ? AND status != 'deleted' ORDER BY id DESC`,
        ['%' + name + '%'],
        (err, rows) => {
            if (err) return res.status(500).json({ success: false, error: err.message });
            const csv = exportTripsCSV(rows || []);
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', 'attachment; filename="driver-' + name + '.csv"');
            res.send(csv);
        }
    );
});

module.exports = router;