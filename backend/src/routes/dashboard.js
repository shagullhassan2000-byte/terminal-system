// ============================================
// DASHBOARD ROUTES v8
// /stats        — today summary
// /chart?days=7 — Chart.js data
// /drivers      — availability summary
// ============================================

const express = require('express');
const router  = express.Router();
const path    = require('path');
const db      = require(path.join(__dirname, '../../database/init'));
const { requireStaff } = require('../middleware/rbac');

// GET /api/dashboard/stats
router.get('/stats', requireStaff, (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    db.all(
        `SELECT type,
                COUNT(*) as trips,
                SUM(passengers_count) as passengers,
                SUM(total_income) as income,
                SUM(CASE WHEN status='active' THEN 1 ELSE 0 END) as active
         FROM trips
         WHERE DATE(start_time) = ?
           AND status != 'deleted'
         GROUP BY type`,
        [today],
        (err, rows) => {
            if (err) return res.status(500).json({ success: false, error: err.message });
            const stats = {
                cityTaxi:     { trips:0, passengers:0, income:0, active:0 },
                shortDistance: { trips:0, passengers:0, income:0, active:0 },
                bus:          { trips:0, passengers:0, income:0, active:0 },
                total:        { trips:0, passengers:0, income:0, active:0 }
            };
            (rows||[]).forEach(r => {
                if (r.type==='City Taxi')     stats.cityTaxi=r;
                if (r.type==='Short Distance') stats.shortDistance=r;
                if (r.type==='Bus')           stats.bus=r;
                ['trips','passengers','income','active'].forEach(k => {
                    stats.total[k] += r[k] || 0;
                });
            });
            res.json({ success: true, data: stats });
        }
    );
});

// GET /api/dashboard/chart?days=7
router.get('/chart', requireStaff, (req, res) => {
    const days = Math.min(parseInt(req.query.days) || 7, 30);
    const dateList = [], labels = [];

    for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        dateList.push(d.toISOString().split('T')[0]);
        labels.push(d.getDate() + '/' + (d.getMonth()+1));
    }

    const ph = dateList.map(() => '?').join(',');
    db.all(
        `SELECT DATE(start_time) as day,
                COUNT(*) as trips,
                SUM(passengers_count) as passengers,
                SUM(total_income) as income
         FROM trips
         WHERE DATE(start_time) IN (${ph})
           AND status NOT IN ('cancelled', 'deleted')
         GROUP BY DATE(start_time)
         ORDER BY day`,
        dateList,
        (err, rows) => {
            if (err) return res.status(500).json({ success: false, error: err.message });
            const map = {};
            (rows||[]).forEach(r => { map[r.day] = r; });
            res.json({
                success: true,
                data: {
                    labels,
                    trips:      dateList.map(d => (map[d] && map[d].trips)      || 0),
                    passengers: dateList.map(d => (map[d] && map[d].passengers) || 0),
                    income:     dateList.map(d => (map[d] && map[d].income)     || 0)
                }
            });
        }
    );
});

// GET /api/dashboard/drivers
router.get('/drivers', requireStaff, (req, res) => {
    db.all(
        "SELECT availability, COUNT(*) as count FROM drivers WHERE status='active' GROUP BY availability",
        [],
        (err, rows) => {
            if (err) return res.status(500).json({ success: false, error: err.message });
            const summary = { available: 0, on_trip: 0, off_duty: 0 };
            (rows||[]).forEach(r => { summary[r.availability] = r.count; });
            res.json({ success: true, data: summary });
        }
    );
});

module.exports = router;