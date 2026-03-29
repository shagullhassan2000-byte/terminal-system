// ============================================
// RBAC MIDDLEWARE — DB-verified roles
// ============================================

const db = require('../../database/init');

function requireAdmin(req, res, next) {
    const username = req.headers['x-username'];
    if (!username) return res.status(401).json({ success: false, error: '❌ دەبێت چوونەژوورەوە بکەیت' });
    db.get('SELECT role, active FROM users WHERE username = ?', [username], (err, user) => {
        if (err)                    return res.status(500).json({ success: false, error: 'system error' });
        if (!user || !user.active)  return res.status(401).json({ success: false, error: '❌ هەژمار نەدۆزرایەوە' });
        if (user.role !== 'admin')  return res.status(403).json({ success: false, error: '❌ تەنها بۆ ئەدمین' });
        req.username = username;
        req.role     = user.role;
        next();
    });
}

function requireStaff(req, res, next) {
    const username = req.headers['x-username'];
    if (!username) return res.status(401).json({ success: false, error: '❌ دەبێت چوونەژوورەوە بکەیت' });
    db.get('SELECT role, active FROM users WHERE username = ?', [username], (err, user) => {
        if (err)                   return res.status(500).json({ success: false, error: 'system error' });
        if (!user || !user.active) return res.status(401).json({ success: false, error: '❌ هەژمار نەدۆزرایەوە' });
        if (user.role !== 'admin' && user.role !== 'staff')
            return res.status(403).json({ success: false, error: '❌ دەسەڵات نیە' });
        req.username = username;
        req.role     = user.role;
        next();
    });
}

module.exports = { requireAdmin, requireStaff };
