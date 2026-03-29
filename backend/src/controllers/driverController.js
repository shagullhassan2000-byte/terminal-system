// ============================================
// DRIVER CONTROLLER v6
// ✅ Soft delete (status = 'inactive')
// ✅ Activity logging for all write actions
// ✅ Search filters hidden (inactive) drivers
// ============================================

const db = require('../../database/init');
const { logActivity } = require('../utils/logger');

// ── Internal log helper ──────────────────────
function log(req, action, details) {
    const user = (req && req.headers && req.headers['x-username']) || 'system';
    logActivity(user, action, details || '');
    db.run('INSERT INTO activity_log (username,action,details) VALUES (?,?,?)',
        [user, action, details || '']);
}

// GET /api/drivers — all ACTIVE drivers
exports.getAll = (req, res) => {
    db.all("SELECT * FROM drivers WHERE status='active' ORDER BY name ASC", [], (err, rows) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        res.json({ success: true, data: rows || [] });
    });
};

// GET /api/drivers/available — available + active only
exports.getAvailable = (req, res) => {
    db.all("SELECT * FROM drivers WHERE availability='available' AND status='active' ORDER BY name ASC", [], (err, rows) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        res.json({ success: true, data: rows || [] });
    });
};

// GET /api/drivers/search?q=... — search active only
exports.search = (req, res) => {
    const q = req.query.q || '';
    if (!q) return res.json({ success: true, data: [] });
    db.all(
        "SELECT * FROM drivers WHERE (name LIKE ? OR phone LIKE ? OR car_number LIKE ?) AND status='active' LIMIT 10",
        ['%'+q+'%', '%'+q+'%', '%'+q+'%'],
        (err, rows) => {
            if (err) return res.status(500).json({ success: false, error: err.message });
            res.json({ success: true, data: rows || [] });
        }
    );
};

// GET /api/drivers/:id
exports.getById = (req, res) => {
    db.get('SELECT * FROM drivers WHERE id=?', [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        if (!row) return res.status(404).json({ success: false, error: 'شۆفێر نەدۆزرایەوە' });
        res.json({ success: true, data: row });
    });
};

// POST /api/drivers — create new driver
exports.create = (req, res) => {
    const { name, phone, car_number, car_type } = req.body;
    if (!name || !phone || !car_number)
        return res.status(400).json({ success: false, error: 'ناو، مۆبایل، و ئۆتۆمبێل پێویستە' });

    db.run(
        "INSERT INTO drivers (name,phone,car_number,car_type,availability,status) VALUES (?,?,?,?,'available','active')",
        [name.trim(), phone.trim(), car_number.trim(), car_type || 'Taxi'],
        function(err) {
            if (err) return res.status(500).json({ success: false, error: err.message });
            log(req, 'DRIVER_ADDED', name.trim() + ' — ' + car_number.trim());
            res.status(201).json({ success: true, data: { id: this.lastID } });
        }
    );
};

// PUT /api/drivers/:id — update driver info
exports.update = (req, res) => {
    const { name, phone, car_number, car_type } = req.body;
    db.run(
        'UPDATE drivers SET name=?,phone=?,car_number=?,car_type=? WHERE id=?',
        [name, phone, car_number, car_type, req.params.id],
        function(err) {
            if (err) return res.status(500).json({ success: false, error: err.message });
            log(req, 'DRIVER_UPDATED', (name || '') + ' #' + req.params.id);
            res.json({ success: true, message: 'شۆفێر نوێکرایەوە' });
        }
    );
};

// PUT /api/drivers/:id/availability — set availability
exports.setAvailability = (req, res) => {
    const { availability } = req.body;
    if (!['available', 'on_trip', 'off_duty'].includes(availability))
        return res.status(400).json({ success: false, error: 'دۆخی هەڵە' });

    db.run('UPDATE drivers SET availability=? WHERE id=?',
        [availability, req.params.id],
        function(err) {
            if (err) return res.status(500).json({ success: false, error: err.message });
            res.json({ success: true });
        }
    );
};

// DELETE /api/drivers/:id — SOFT DELETE (status = 'inactive')
// Driver data stays in DB — trips history intact
// Driver removed from all active lists and search
exports.delete = (req, res) => {
    // First get driver name for the log
    db.get('SELECT name, car_number FROM drivers WHERE id=?', [req.params.id], (err, driver) => {
        if (!driver)
            return res.status(404).json({ success: false, error: 'شۆفێر نەدۆزرایەوە' });

        db.run(
            "UPDATE drivers SET status='inactive', availability='off_duty' WHERE id=?",
            [req.params.id],
            function(err) {
                if (err) return res.status(500).json({ success: false, error: err.message });
                log(req, 'DRIVER_DELETED', driver.name + ' — ' + driver.car_number + ' #' + req.params.id);
                res.json({ success: true, message: 'شۆفێر سڕایەوە' });
            }
        );
    });
};