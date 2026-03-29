// ============================================
// AUTH ROUTES v4
// - bcrypt password verification
// - Login rate limiting handled in app.js
// ============================================

const express = require('express');
const router  = express.Router();
const path    = require('path');
const bcrypt  = require('bcrypt');
const db      = require(path.join(__dirname, '../../database/init'));
const { validateLogin } = require('../middleware/validate');
const { requireAdmin }  = require('../middleware/rbac');

const SALT_ROUNDS = 10;

// ---- LOGIN ----
router.post('/login', validateLogin, (req, res) => {
    const { username, password } = req.body;

    db.get('SELECT id,username,password,role,full_name,active FROM users WHERE username=?',
        [username], (err, user) => {
            if (err) return res.json({ success: false, error: 'system error' });

            if (!user) {
                db.run('INSERT INTO activity_log (username,action,details,ip) VALUES (?,?,?,?)',
                    [username, 'LOGIN_FAILED', 'User not found', req.ip]);
                return res.json({ success: false, error: 'ناوی بەکارهێنەر یان وشەی نهێنی هەڵەیە' });
            }

            if (!user.active)
                return res.json({ success: false, error: 'ئەم هەژماری چالاک نیە — پەیوەندی بە ئەدمین بکە' });

            bcrypt.compare(password, user.password, (err, match) => {
                if (err || !match) {
                    db.run('INSERT INTO activity_log (username,action,details,ip) VALUES (?,?,?,?)',
                        [username, 'LOGIN_FAILED', 'Wrong password', req.ip]);
                    return res.json({ success: false, error: 'ناوی بەکارهێنەر یان وشەی نهێنی هەڵەیە' });
                }

                db.run('UPDATE users SET last_login=? WHERE id=?', [new Date().toISOString(), user.id]);
                db.run('INSERT INTO activity_log (username,action,details,ip) VALUES (?,?,?,?)',
                    [username, 'LOGIN', 'Success', req.ip]);

                res.json({
                    success: true,
                    data: { username: user.username, role: user.role, fullName: user.full_name }
                });
            });
        }
    );
});

// ---- GET ALL USERS (admin only) ----
router.get('/users', requireAdmin, (req, res) => {
    db.all('SELECT id,username,role,full_name,active,created_at,last_login FROM users ORDER BY id',
        [], (err, rows) => {
            if (err) return res.json({ success: false, error: err.message });
            res.json({ success: true, data: rows || [] });
        });
});

// ---- CREATE USER (admin only) ----
router.post('/users', requireAdmin, (req, res) => {
    const { username, password, role, full_name } = req.body;
    if (!username || !password || password.length < 4)
        return res.json({ success: false, error: 'ناو و وشەی نهێنی پێویستە (کەمتر نەبێ لە ٤ پیت)' });

    bcrypt.hash(password, SALT_ROUNDS, (err, hash) => {
        if (err) return res.json({ success: false, error: 'system error' });
        db.run('INSERT INTO users (username,password,role,full_name) VALUES (?,?,?,?)',
            [username.trim().toLowerCase(), hash, role || 'staff', full_name || ''],
            function(err) {
                if (err) {
                    if (err.message.includes('UNIQUE'))
                        return res.json({ success: false, error: 'ئەم ناوە پێشتر هەیە' });
                    return res.json({ success: false, error: err.message });
                }
                res.json({ success: true, data: { id: this.lastID } });
            });
    });
});

// ---- CHANGE PASSWORD (admin only) ----
router.put('/users/:id/password', requireAdmin, (req, res) => {
    const { new_password } = req.body;
    if (!new_password || new_password.length < 4)
        return res.json({ success: false, error: 'وشەی نهێنی کەمتر نەبێ لە ٤ پیت)پێویستە' });

    bcrypt.hash(new_password, SALT_ROUNDS, (err, hash) => {
        if (err) return res.json({ success: false, error: 'system error' });
        db.run('UPDATE users SET password=? WHERE id=?', [hash, req.params.id], function(err) {
            if (err) return res.json({ success: false, error: err.message });
            res.json({ success: true, message: 'وشەی نهێنی نوێکرایەوە ✅' });
        });
    });
});

// ---- TOGGLE USER (admin only) ----
router.put('/users/:id/toggle', requireAdmin, (req, res) => {
    db.run('UPDATE users SET active=CASE WHEN active=1 THEN 0 ELSE 1 END WHERE id=?',
        [req.params.id], function(err) {
            if (err) return res.json({ success: false, error: err.message });
            res.json({ success: true });
        });
});

// ---- DELETE USER (admin only) ----
router.delete('/users/:id', requireAdmin, (req, res) => {
    db.run("DELETE FROM users WHERE id=? AND username!='admin'", [req.params.id], function(err) {
        if (err) return res.json({ success: false, error: err.message });
        res.json({ success: true, message: 'بەکارهێنەر سڕایەوە' });
    });
});

// ---- ACTIVITY LOG (admin only) ----
router.get('/log', requireAdmin, (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 200, 500);
    db.all('SELECT * FROM activity_log ORDER BY id DESC LIMIT ?', [limit], (err, rows) => {
        if (err) return res.json({ success: false, error: err.message });
        res.json({ success: true, data: rows || [] });
    });
});

module.exports = router;