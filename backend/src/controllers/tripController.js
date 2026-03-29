// ============================================
// TRIP CONTROLLER v8
// ✅ Driver rest period (reads from settings)
// ✅ Max trips per day (reads from settings)
// ✅ Driver double-booking prevention
// ✅ Capacity limits per trip type
// ✅ HU-YYYY-NNNN trip codes (atomic)
// ✅ Full status: active / completed / cancelled
// ✅ Soft delete: status = 'deleted' (data kept)
// ✅ Error + activity logging
// ============================================

const db  = require('../../database/init');
const { logError, logActivity } = require('../utils/logger');

const CAPACITY_DEFAULT = { 'City Taxi': 9, 'Short Distance': 9, 'Bus': 50 };

// ── Internal log helper ──────────────────────
function log(user, action, details) {
    logActivity(user || 'system', action, details || '');
    db.run('INSERT INTO activity_log (username,action,details) VALUES (?,?,?)',
        [user || 'system', action, details || '']);
}

function getSettings(cb) {
    db.all(
        "SELECT key, value FROM settings WHERE key IN ('rest_hours','max_trips_day','taxi_capacity','shortdistance_capacity','bus_capacity')",
        [], (err, rows) => {
            const cfg = { rest_hours: 2, max_trips_day: 8, taxi: 9, shortdistance: 9, bus: 50 };
            if (rows) rows.forEach(r => {
                if (r.key === 'rest_hours')            cfg.rest_hours    = parseInt(r.value) || 2;
                if (r.key === 'max_trips_day')         cfg.max_trips_day = parseInt(r.value) || 8;
                if (r.key === 'taxi_capacity')         cfg.taxi          = parseInt(r.value) || 9;
                if (r.key === 'shortdistance_capacity') cfg.shortdistance  = parseInt(r.value) || 9;
                if (r.key === 'bus_capacity')          cfg.bus           = parseInt(r.value) || 50;
            });
            cb(cfg);
        }
    );
}

// GET /api/trips — all non-deleted
exports.getAll = (req, res) => {
    const limit  = Math.min(parseInt(req.query.limit) || 100, 500);
    const type   = req.query.type   || null;
    const status = (req.query.status && req.query.status !== "deleted") ? req.query.status : null;

    let sql = "SELECT * FROM trips WHERE status != 'deleted' ORDER BY id DESC LIMIT ?";
    let params = [limit];

    if (type && status) {
        sql = "SELECT * FROM trips WHERE type=? AND status=? AND status != 'deleted' ORDER BY id DESC LIMIT ?";
        params = [type, status, limit];
    } else if (type) {
        sql = "SELECT * FROM trips WHERE type=? AND status != 'deleted' ORDER BY id DESC LIMIT ?";
        params = [type, limit];
    } else if (status) {
        sql = "SELECT * FROM trips WHERE status=? AND status != 'deleted' ORDER BY id DESC LIMIT ?";
        params = [status, limit];
    }

    db.all(sql, params, (err, rows) => {
        if (err) { logError('getAll', err); return res.status(500).json({ success: false, error: err.message }); }
        res.json({ success: true, data: rows || [] });
    });
};

// GET /api/trips/active — active only (never deleted)
exports.getActive = (req, res) => {
    db.all(
        "SELECT * FROM trips WHERE status='active' ORDER BY start_time DESC",
        [], (err, rows) => {
            if (err) { logError('getActive', err); return res.status(500).json({ success: false, error: err.message }); }
            res.json({ success: true, data: rows || [] });
        }
    );
};

// GET /api/trips/history — completed + cancelled (not deleted)
exports.getHistory = (req, res) => {
    db.all(
        "SELECT * FROM trips WHERE status IN ('completed','cancelled') ORDER BY COALESCE(end_time,start_time) DESC LIMIT 300",
        [], (err, rows) => {
            if (err) { logError('getHistory', err); return res.status(500).json({ success: false, error: err.message }); }
            res.json({ success: true, data: rows || [] });
        }
    );
};

// GET /api/trips/stats — today's stats (not deleted)
exports.getStats = (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    db.all(
        "SELECT type,COUNT(*) as trips,SUM(passengers_count) as passengers,SUM(total_income) as income," +
        "SUM(CASE WHEN status='active' THEN 1 ELSE 0 END) as active " +
        "FROM trips WHERE DATE(start_time)=? AND status != 'deleted' GROUP BY type",
        [today], (err, rows) => {
            if (err) { logError('getStats', err); return res.status(500).json({ success: false, error: err.message }); }
            const stats = {
                cityTaxi:      { trips:0, passengers:0, income:0, active:0 },
                shortDistance: { trips:0, passengers:0, income:0, active:0 },
                bus:           { trips:0, passengers:0, income:0, active:0 },
                total:         { trips:0, passengers:0, income:0, active:0 }
            };
            (rows||[]).forEach(r => {
                if (r.type==='City Taxi')      stats.cityTaxi=r;
                if (r.type==='Short Distance') stats.shortDistance=r;
                if (r.type==='Bus')            stats.bus=r;
                ['trips','passengers','income','active'].forEach(k => { stats.total[k] += r[k] || 0; });
            });
            res.json({ success: true, data: stats });
        }
    );
};

// GET /api/trips/:id
exports.getById = (req, res) => {
    db.get('SELECT * FROM trips WHERE id=?', [req.params.id], (err, row) => {
        if (err) { logError('getById', err); return res.status(500).json({ success: false, error: err.message }); }
        if (!row) return res.status(404).json({ success: false, error: 'ڕۆیشتن نەدۆزرایەوە' });
        res.json({ success: true, data: row });
    });
};

// POST /api/trips — create trip
exports.create = (req, res) => {
    const { type, driver_name, driver_phone, driver_car, driver_id,
            route_from, route_to, fare_per_person, capacity_limit, created_by } = req.body;

    if (!type || !driver_name || !route_from || !route_to)
        return res.status(400).json({ success: false, error: 'جۆر، شۆفێر، و ڕێگە پێویستە' });

    const today = new Date().toISOString().split('T')[0];
    const user  = created_by || req.username || 'system';

    getSettings((cfg) => {
        const capMap = { 'City Taxi': cfg.taxi, 'Short Distance': cfg.shortdistance, 'Bus': cfg.bus };
        const cap    = capacity_limit || capMap[type] || 0;

        const doCreate = () => {
            db.generateTripCode((tripCode) => {
                db.run(
                    'INSERT INTO trips (trip_code,type,driver_id,driver_name,driver_phone,driver_car,route_from,route_to,fare_per_person,capacity_limit,status,start_time,created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',
                    [tripCode, type, driver_id||null, driver_name.trim(), driver_phone||'', driver_car||'',
                     route_from.trim(), route_to.trim(), fare_per_person||0, cap, 'active', new Date().toISOString(), user],
                    function(err) {
                        if (err) { logError('create trip', err); return res.status(500).json({ success: false, error: err.message }); }
                        const tripId = this.lastID;
                        if (driver_id) db.run("UPDATE drivers SET availability='on_trip' WHERE id=?", [driver_id]);
                        log(user, 'TRIP_CREATED', tripCode + ' | ' + type + ' | ' + driver_name + ' | ' + route_from + '→' + route_to);
                        res.status(201).json({ success: true, data: { id: tripId, trip_code: tripCode, capacity_limit: cap } });
                    }
                );
            });
        };

        if (!driver_id) return doCreate();

        db.get('SELECT availability, name FROM drivers WHERE id=?', [driver_id], (err, driver) => {
            if (err) { logError('check driver avail', err); return res.status(500).json({ success: false, error: err.message }); }
            if (driver && driver.availability === 'on_trip')
                return res.status(400).json({ success: false, error: '🚫 شۆفێر ' + driver.name + ' ئێستا لە ڕێگایدایە — بەردەست نیە' });

            db.get(
                "SELECT end_time FROM trips WHERE driver_id=? AND status='completed' ORDER BY end_time DESC LIMIT 1",
                [driver_id], (err, lastTrip) => {
                    if (lastTrip && lastTrip.end_time) {
                        const hoursAgo = (Date.now() - new Date(lastTrip.end_time)) / (1000 * 60 * 60);
                        if (hoursAgo < cfg.rest_hours) {
                            const remaining = Math.ceil((cfg.rest_hours - hoursAgo) * 60);
                            return res.status(400).json({
                                success: false,
                                error: '⏰ شۆفێر پێویستە ' + remaining + ' خولەکی تر بنووسێت (کەمی ' + cfg.rest_hours + ' کاتژمێر پێویستە)'
                            });
                        }
                    }
                    db.get(
                        "SELECT COUNT(*) as count FROM trips WHERE driver_id=? AND DATE(start_time)=? AND status != 'deleted'",
                        [driver_id, today], (err, row) => {
                            if (row && row.count >= cfg.max_trips_day)
                                return res.status(400).json({
                                    success: false,
                                    error: '🚫 شۆفێر گەیشتە زۆرینەی گەشت بۆ ئەمڕۆ (' + cfg.max_trips_day + ' ڕۆیشتن)'
                                });
                            doCreate();
                        }
                    );
                }
            );
        });
    });
};

// PUT /api/trips/:id — update trip
exports.update = (req, res) => {
    const { driver_name, driver_phone, driver_car, route_from, route_to,
            fare_per_person, notes, passengers_count, total_income, status, updated_by } = req.body;
    db.run(
        'UPDATE trips SET driver_name=?,driver_phone=?,driver_car=?,route_from=?,route_to=?,fare_per_person=?,notes=?,passengers_count=?,total_income=?,status=? WHERE id=?',
        [driver_name, driver_phone, driver_car, route_from, route_to,
         fare_per_person||0, notes||'', passengers_count||0, total_income||0, status, req.params.id],
        function(err) {
            if (err) { logError('update trip', err); return res.status(500).json({ success: false, error: err.message }); }
            log(updated_by || req.username, 'TRIP_UPDATED', 'Trip #' + req.params.id);
            res.json({ success: true, message: 'گەشت نوێکرایەوە' });
        }
    );
};

// PUT /api/trips/:id/complete
exports.complete = (req, res) => {
    const user = (req.body && req.body.completed_by) || req.username || 'system';
    db.get('SELECT driver_id, trip_code FROM trips WHERE id=?', [req.params.id], (err, trip) => {
        if (!trip) return res.status(404).json({ success: false, error: 'گەشت نەدۆزرایەوە' });
        db.run(
            "UPDATE trips SET status='completed', end_time=? WHERE id=?",
            [new Date().toISOString(), req.params.id],
            function(err) {
                if (err) { logError('complete trip', err); return res.status(500).json({ success: false, error: err.message }); }
                if (trip.driver_id) db.run("UPDATE drivers SET availability='available' WHERE id=?", [trip.driver_id]);
                log(user, 'TRIP_COMPLETED', trip.trip_code || '#' + req.params.id);
                res.json({ success: true, message: 'گەشت تەواو کرا ✅' });
            }
        );
    });
};

// PUT /api/trips/:id/cancel — admin only
exports.cancel = (req, res) => {
    const user = (req.body && req.body.cancelled_by) || req.username || 'system';
    db.get('SELECT driver_id, trip_code FROM trips WHERE id=?', [req.params.id], (err, trip) => {
        if (!trip) return res.status(404).json({ success: false, error: 'گەشت نەدۆزرایەوە' });
        db.run(
            "UPDATE trips SET status='cancelled', end_time=? WHERE id=?",
            [new Date().toISOString(), req.params.id],
            function(err) {
                if (err) { logError('cancel trip', err); return res.status(500).json({ success: false, error: err.message }); }
                if (trip.driver_id) db.run("UPDATE drivers SET availability='available' WHERE id=?", [trip.driver_id]);
                log(user, 'TRIP_CANCELLED', trip.trip_code || '#' + req.params.id);
                res.json({ success: true, message: 'گەشت هەڵوەشایەوە' });
            }
        );
    });
};

// DELETE /api/trips/:id — SOFT DELETE (admin only)
// Sets status = 'deleted' — data kept, never shown in normal views
// Trip history, passenger records, and income stats all preserved
exports.delete = (req, res) => {
    const user = req.username || req.query.by || 'system';
    db.get('SELECT driver_id, trip_code, status FROM trips WHERE id=?', [req.params.id], (err, trip) => {
        if (!trip) return res.status(404).json({ success: false, error: 'گەشت نەدۆزرایەوە' });
        if (trip.status === 'deleted')
            return res.status(400).json({ success: false, error: 'ئەم گەشتە پێشتر سڕایەوەیە' });

        db.run(
            "UPDATE trips SET status='deleted', end_time=COALESCE(end_time,?) WHERE id=?",
            [new Date().toISOString(), req.params.id],
            function(err) {
                if (err) { logError('delete trip', err); return res.status(500).json({ success: false, error: err.message }); }
                if (trip.driver_id && trip.status === 'active')
                    db.run("UPDATE drivers SET availability='available' WHERE id=?", [trip.driver_id]);
                log(user, 'TRIP_DELETED', (trip.trip_code || '#' + req.params.id) + ' (soft delete)');
                res.json({ success: true, message: 'گەشت سڕایەوە' });
            }
        );
    });
};

// GET /api/trips/capacity
exports.getCapacity = (req, res) => {
    getSettings((cfg) => {
        res.json({
            success: true,
            data: { 'City Taxi': cfg.taxi, 'Short Distance': cfg.shortdistance, 'Bus': cfg.bus },
            rest_hours:    cfg.rest_hours,
            max_trips_day: cfg.max_trips_day
        });
    });
};