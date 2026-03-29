// ============================================
// PASSENGER CONTROLLER v5
// ✅ Duplicate passport check per trip
// ✅ Capacity enforcement
// ✅ SQLite TRANSACTION for bulk insert
// ✅ Global search excludes deleted trips
// ✅ Delete: hard delete passenger + fix count
//    (passengers have no independent lifecycle —
//     they only exist inside a trip.
//     If the trip is soft-deleted, passengers
//     are already hidden because we filter trips.
//     Individual passenger removal = hard delete
//     because we need accurate seat counts.)
// ============================================

const db = require('../../database/init');

// GET /api/passengers/trip/:tripId
exports.getByTrip = (req, res) => {
    db.all(
        'SELECT * FROM passengers WHERE trip_id=? ORDER BY id',
        [req.params.tripId],
        (err, rows) => {
            if (err) return res.status(500).json({ success: false, error: err.message });
            res.json({ success: true, data: rows || [] });
        }
    );
};

// GET /api/passengers/search?q=...
// Only shows passengers from NON-deleted trips
exports.search = (req, res) => {
    const q = (req.query.q || '').trim();
    if (q.length < 2) return res.json({ success: true, data: [] });

    db.all(
        `SELECT p.*, t.trip_code, t.type, t.driver_name, t.route_from, t.route_to, t.start_time
         FROM passengers p
         JOIN trips t ON p.trip_id = t.id
         WHERE (p.name LIKE ? OR p.passport LIKE ? OR p.nationality LIKE ?)
           AND t.status != 'deleted'
         ORDER BY p.id DESC
         LIMIT 100`,
        ['%'+q+'%', '%'+q+'%', '%'+q+'%'],
        (err, rows) => {
            if (err) return res.status(500).json({ success: false, error: err.message });
            res.json({ success: true, data: rows || [] });
        }
    );
};

// POST /api/passengers — add single passenger to active trip
exports.create = (req, res) => {
    const { trip_id, name, passport, nationality } = req.body;
    if (!trip_id || !name) return res.status(400).json({ success: false, error: 'پێویستە' });

    db.get(
        'SELECT passengers_count, capacity_limit, status FROM trips WHERE id=?',
        [trip_id],
        (err, trip) => {
            if (err) return res.status(500).json({ success: false, error: err.message });
            if (!trip) return res.status(404).json({ success: false, error: 'گەشت نەدۆزرایەوە' });
            if (trip.status !== 'active')
                return res.status(400).json({ success: false, error: 'ئەم ڕۆیشتنە چالاک نیە' });

            // Capacity check
            if (trip.capacity_limit > 0 && trip.passengers_count >= trip.capacity_limit)
                return res.status(400).json({
                    success: false,
                    error: '❌ گەیشتیتە سنووری زۆرینە (' + trip.capacity_limit + ' کەس)',
                    capacity_reached: true
                });

            // Duplicate passport check
            const cleanPassport = (passport || '').trim();
            if (cleanPassport) {
                // Minimum length check — prevents saving barcode scans or typos
                if (cleanPassport.length < 5) {
                    return res.status(400).json({
                        success: false,
                        error: '⚠️ پێویستە ژمارەی پاسپۆرت کەمتر نەبێ  لە ٥ پیت: ' + cleanPassport
                    });
                }
                db.get(
                    "SELECT id FROM passengers WHERE trip_id=? AND passport=? AND passport!=''",
                    [trip_id, cleanPassport],
                    (err, existing) => {
                        if (existing)
                            return res.status(400).json({
                                success: false,
                                error: '⚠️ ئەم پاسپۆرتە پێشتر لە ئەم ڕۆیشتنەدا تۆمارکراوە: ' + cleanPassport
                            });
                        insertPassenger();
                    }
                );
            } else {
                insertPassenger();
            }

            function insertPassenger() {
                db.run(
                    'INSERT INTO passengers (trip_id,name,passport,nationality) VALUES (?,?,?,?)',
                    [trip_id, name.trim(), cleanPassport, (nationality||'').trim()],
                    function(err) {
                        if (err) return res.status(500).json({ success: false, error: err.message });
                        db.run(
                            'UPDATE trips SET passengers_count=passengers_count+1, total_income=fare_per_person*(passengers_count+1) WHERE id=?',
                            [trip_id]
                        );
                        res.status(201).json({
                            success: true,
                            data: { id: this.lastID },
                            passengers_count: trip.passengers_count + 1,
                            capacity_limit:   trip.capacity_limit
                        });
                    }
                );
            }
        }
    );
};

// POST /api/passengers/bulk — add multiple passengers in one transaction
exports.bulkCreate = (req, res) => {
    const { trip_id, passengers } = req.body;
    if (!trip_id || !passengers || !passengers.length)
        return res.status(400).json({ success: false, error: 'پێویستە' });

    db.get(
        'SELECT passengers_count, capacity_limit, status FROM trips WHERE id=?',
        [trip_id],
        (err, trip) => {
            if (err) return res.status(500).json({ success: false, error: err.message });
            if (!trip) return res.status(404).json({ success: false, error: 'ڕۆیشتن نەدۆزرایەوە' });
            if (trip.status !== 'active')
                return res.status(400).json({ success: false, error: 'ئەم ڕۆیشتنە چالاک نیە' });

            // Capacity check
            const totalAfter = trip.passengers_count + passengers.length;
            if (trip.capacity_limit > 0 && totalAfter > trip.capacity_limit)
                return res.status(400).json({
                    success: false,
                    error: '❌ ' + passengers.length + ' کەسی نوێ + ' + trip.passengers_count + ' ی هەیە = ' + totalAfter + ' — زیادترە لە سنووری ' + trip.capacity_limit + ' کەس',
                    capacity_reached: true
                });

            // Duplicate passport check within list
            const passports = passengers.map(p => (p.passport||'').trim()).filter(p => p);
            if (new Set(passports).size !== passports.length)
                return res.status(400).json({ success: false, error: '⚠️ لیستەکەت پاسپۆرتی دووبارە هەیە' });

            const valid = passengers.filter(p => p.name && p.name.trim().length >= 2);
            if (!valid.length)
                return res.status(400).json({ success: false, error: 'هیچ گەشتیارێکی دروست نیە' });

            // Atomic bulk insert with TRANSACTION — sequential, no race condition
            db.run('BEGIN TRANSACTION', (err) => {
                if (err) return res.status(500).json({ success: false, error: ' system error: ' + err.message });

                let i = 0;
                function insertNext() {
                    if (i >= valid.length) {
                        // All inserted — commit
                        return db.run('COMMIT', (err) => {
                            if (err) {
                                db.run('ROLLBACK');
                                return res.status(500).json({ success: false, error: ' commit error: ' + err.message });
                            }
                            const newTotal = trip.passengers_count + valid.length;
                            db.run(
                                'UPDATE trips SET passengers_count=?, total_income=fare_per_person*? WHERE id=?',
                                [newTotal, newTotal, trip_id]
                            );
                            res.status(201).json({
                                success: true,
                                message: valid.length + ' گەشتیار زیادکران ✅',
                                passengers_count: newTotal,
                                capacity_limit: trip.capacity_limit
                            });
                        });
                    }
                    const p = valid[i++];
                    db.run(
                        'INSERT INTO passengers (trip_id,name,passport,nationality) VALUES (?,?,?,?)',
                        [trip_id, p.name.trim(), (p.passport||'').trim(), (p.nationality||'').trim()],
                        (err) => {
                            if (err) {
                                db.run('ROLLBACK');
                                return res.status(500).json({ success: false, error: 'rollback error : ' + err.message });
                            }
                            insertNext();
                        }
                    );
                }
                insertNext();
            });
        }
    );
};

// DELETE /api/passengers/:id — remove passenger (admin only)
// Hard delete: passenger is removed AND trip count is corrected.
// Passengers have no independent lifecycle — they only make sense
// inside a trip. Soft delete here would cause seat count errors.
exports.delete = (req, res) => {
    db.get('SELECT trip_id FROM passengers WHERE id=?', [req.params.id], (err, pax) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        if (!pax) return res.status(404).json({ success: false, error: 'گەشتیار نەدۆزرایەوە' });

        db.run('DELETE FROM passengers WHERE id=?', [req.params.id], function(err) {
            if (err) return res.status(500).json({ success: false, error: err.message });
            // Correct count AND recalculate income — both must stay accurate
            db.run(
                'UPDATE trips SET passengers_count=MAX(0,passengers_count-1), total_income=fare_per_person*MAX(0,passengers_count-1) WHERE id=?',
                [pax.trip_id]
            );
            res.json({ success: true, message: 'گەشتیار سڕایەوە' });
        });
    });
};