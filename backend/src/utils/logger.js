// ============================================
// LOGGER UTILITY
// ============================================

const fs   = require('fs');
const path = require('path');

const logsDir  = path.join(__dirname, '../../logs');
const errorLog = path.join(logsDir, 'error.log');
const actLog   = path.join(logsDir, 'activity.log');

if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

function logError(context, err) {
    const line = '[' + new Date().toISOString() + '] ERROR ' + context + ': ' + (err && err.message ? err.message : String(err)) + '\n';
    console.error(line.trim());
    try { fs.appendFileSync(errorLog, line); } catch(e) {}
}

function logActivity(username, action, details) {
    const line = '[' + new Date().toISOString() + '] ' + username + ' | ' + action + ' | ' + (details || '') + '\n';
    try { fs.appendFileSync(actLog, line); } catch(e) {}
}

module.exports = { logError, logActivity };
