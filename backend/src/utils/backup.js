const fs   = require('fs');
const path = require('path');

const DB_PATH    = path.join(__dirname, '../../database/terminal.db');
const BACKUP_DIR = path.join(__dirname, '../../database/backups');

if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

function saveBackup(label) {
    if (!fs.existsSync(DB_PATH)) return null;
    const today = new Date().toISOString().split('T')[0];
    const name  = 'terminal-' + (label || 'backup') + '-' + today + '.db';
    const dest  = path.join(BACKUP_DIR, name);
    fs.copyFileSync(DB_PATH, dest);
    // Keep last 14 backups only
    const files = fs.readdirSync(BACKUP_DIR).filter(f => f.endsWith('.db')).sort();
    if (files.length > 14)
        files.slice(0, files.length - 14).forEach(f => fs.unlinkSync(path.join(BACKUP_DIR, f)));
    return name;
}

function listBackups() {
    if (!fs.existsSync(BACKUP_DIR)) return [];
    return fs.readdirSync(BACKUP_DIR)
        .filter(f => f.endsWith('.db'))
        .sort().reverse()
        .map(f => ({
            name: f,
            size: Math.round(fs.statSync(path.join(BACKUP_DIR, f)).size / 1024) + ' KB',
            date: f.replace('terminal-', '').replace('.db', '')
        }));
}

function restoreBackup(filename) {
    const safe = filename.replace(/[^a-zA-Z0-9\-_.]/g, '');
    const src  = path.join(BACKUP_DIR, safe);
    if (!fs.existsSync(src)) throw new Error('باکئەپی فایل نەدۆزرایەوە: ' + safe);
    saveBackup('before-restore');
    fs.copyFileSync(src, DB_PATH);
    return true;
}

module.exports = { saveBackup, listBackups, restoreBackup };
