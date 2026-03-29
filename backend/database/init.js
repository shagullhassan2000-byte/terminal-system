// ============================================
// DATABASE INIT v7 — FINAL
// ============================================

const sqlite3 = require('sqlite3').verbose();
const path    = require('path');
const bcrypt  = require('bcrypt');

const DB_PATH = path.join(__dirname, 'terminal.db');
const SALT    = 10;

const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) { console.error('❌ DB error:', err.message); process.exit(1); }
    console.log('✅ Database connected:', DB_PATH);
});

db.run('PRAGMA journal_mode = WAL');
db.run('PRAGMA foreign_keys = ON');
db.run('PRAGMA synchronous = NORMAL');
db.run('PRAGMA cache_size = 5000');

db.serialize(() => {

    // DRIVERS
    db.run(`CREATE TABLE IF NOT EXISTS drivers (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        name         TEXT    NOT NULL,
        phone        TEXT    NOT NULL,
        car_number   TEXT    NOT NULL,
        car_type     TEXT    DEFAULT 'Taxi',
        availability TEXT    DEFAULT 'available',
        status       TEXT    DEFAULT 'active',
        created_at   TEXT    DEFAULT CURRENT_TIMESTAMP
    )`, err => { if (err) console.error('Drivers:', err.message); else console.log('✅ Drivers table'); });

    // TRIPS
    db.run(`CREATE TABLE IF NOT EXISTS trips (
        id               INTEGER PRIMARY KEY AUTOINCREMENT,
        trip_code        TEXT    UNIQUE,
        type             TEXT    NOT NULL,
        driver_id        INTEGER,
        driver_name      TEXT    NOT NULL,
        driver_phone     TEXT    DEFAULT '',
        driver_car       TEXT    DEFAULT '',
        route_from       TEXT    NOT NULL,
        route_to         TEXT    NOT NULL,
        passengers_count INTEGER DEFAULT 0,
        fare_per_person  REAL    DEFAULT 0,
        total_income     REAL    DEFAULT 0,
        capacity_limit   INTEGER DEFAULT 0,
        status           TEXT    DEFAULT 'active',
        start_time       TEXT    DEFAULT CURRENT_TIMESTAMP,
        end_time         TEXT,
        notes            TEXT    DEFAULT '',
        created_by       TEXT    DEFAULT 'system'
    )`, err => {
        if (err) console.error('Trips:', err.message);
        else {
            console.log('✅ Trips table');
            ['trip_code TEXT', 'capacity_limit INTEGER DEFAULT 0', "created_by TEXT DEFAULT 'system'"].forEach(col => {
                db.run('ALTER TABLE trips ADD COLUMN ' + col, () => {});
            });
        }
    });

    // PASSENGERS
    db.run(`CREATE TABLE IF NOT EXISTS passengers (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        trip_id     INTEGER NOT NULL,
        name        TEXT    NOT NULL,
        passport    TEXT    DEFAULT '',
        nationality TEXT    DEFAULT '',
        created_at  TEXT    DEFAULT CURRENT_TIMESTAMP
    )`, err => { if (err) console.error('Passengers:', err.message); else console.log('✅ Passengers table'); });

    // SETTINGS
    db.run(`CREATE TABLE IF NOT EXISTS settings (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL DEFAULT ''
    )`, err => {
        if (err) console.error('Settings:', err.message);
        else {
            const defaults = [
                ['receipt_counter', '0'], ['trip_counter', '0'],
                ['backup_last', ''],      ['taxi_capacity', '9'],
                ['shortdistance_capacity', '9'], ['bus_capacity', '50'],
                ['rest_hours', '2'],      ['max_trips_day', '8']
            ];
            defaults.forEach(([k, v]) => db.run('INSERT OR IGNORE INTO settings (key,value) VALUES (?,?)', [k, v]));
            console.log('✅ Settings table');
        }
    });

    // USERS
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        username   TEXT    NOT NULL UNIQUE,
        password   TEXT    NOT NULL,
        role       TEXT    DEFAULT 'staff',
        full_name  TEXT    DEFAULT '',
        active     INTEGER DEFAULT 1,
        created_at TEXT    DEFAULT CURRENT_TIMESTAMP,
        last_login TEXT
    )`, err => {
        if (err) console.error('Users:', err.message);
        else {
            console.log('✅ Users table');
            const seed = (u, p, r, n) => {
                db.get('SELECT id FROM users WHERE username=?', [u], (err, row) => {
                    if (!row) {
                        bcrypt.hash(p, SALT, (err, hash) => {
                            if (!err) db.run('INSERT INTO users (username,password,role,full_name) VALUES (?,?,?,?)', [u, hash, r, n]);
                        });
                    }
                });
            };
            seed('admin',   'terminal2026', 'admin', 'ئەدمین سیستەم');
            seed('shagull', 'hajiumaran',   'admin', 'شاگوڵ');
            seed('staff',   'staff1234',    'staff', 'ستاف');
        }
    });

    // ACTIVITY LOG
    db.run(`CREATE TABLE IF NOT EXISTS activity_log (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        username   TEXT    DEFAULT 'system',
        action     TEXT    NOT NULL,
        details    TEXT    DEFAULT '',
        ip         TEXT    DEFAULT '',
        created_at TEXT    DEFAULT CURRENT_TIMESTAMP
    )`, err => { if (err) console.error('Activity log:', err.message); else console.log('✅ Activity log'); });

    // INDEXES
    [
        'CREATE INDEX IF NOT EXISTS idx_trips_status  ON trips(status)',
        'CREATE INDEX IF NOT EXISTS idx_trips_date    ON trips(date(start_time))',
        'CREATE INDEX IF NOT EXISTS idx_trips_driver  ON trips(driver_id)',
        'CREATE INDEX IF NOT EXISTS idx_trips_type    ON trips(type)',
        'CREATE INDEX IF NOT EXISTS idx_trips_code    ON trips(trip_code)',
        'CREATE INDEX IF NOT EXISTS idx_pass_trip     ON passengers(trip_id)',
        'CREATE INDEX IF NOT EXISTS idx_pass_passport ON passengers(passport)',
        'CREATE INDEX IF NOT EXISTS idx_pass_name     ON passengers(name)',
        'CREATE INDEX IF NOT EXISTS idx_log_user      ON activity_log(username)',
        'CREATE INDEX IF NOT EXISTS idx_log_action    ON activity_log(action)'
    ].forEach(sql => db.run(sql));

    console.log('✅ Database ready');
});

// Atomic trip code generator
db.generateTripCode = function(callback) {
    const year = new Date().getFullYear();
    db.run("UPDATE settings SET value = CAST(CAST(value AS INTEGER) + 1 AS TEXT) WHERE key = 'trip_counter'", function(err) {
        if (err) return callback('HU-' + year + '-' + Date.now());
        db.get("SELECT value FROM settings WHERE key = 'trip_counter'", (err, row) => {
            const num = parseInt(row ? row.value : 1);
            callback('HU-' + year + '-' + String(num).padStart(4, '0'));
        });
    });
};

module.exports = db;
