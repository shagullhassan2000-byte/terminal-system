const fs = require('fs');
const path = require('path');
const DB_PATH = path.join(__dirname, '../../database/terminal.db');
const BACKUP_DIR = path.join(__dirname, '../../database/backups');

function performBackup() {
    if (!fs.existsSync(BACKUP_DIR)) { fs.mkdirSync(BACKUP_DIR, { recursive: true }); }
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const backupPath = path.join(BACKUP_DIR, `terminal-backup-\.db`);
    if (!fs.existsSync(backupPath)) {
        fs.copyFileSync(DB_PATH, backupPath);
        console.log('? Daily backup created.');
    }
}
module.exports = { performBackup };
