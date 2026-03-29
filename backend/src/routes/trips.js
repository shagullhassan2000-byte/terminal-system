// ============================================
// TRIPS ROUTES v5 - with RBAC
// Staff: create, view, complete
// Admin: also delete, cancel
// ============================================

const express = require('express');
const router  = express.Router();
const c       = require('../controllers/tripController');
const { validateTrip } = require('../middleware/validate');
const { requireAdmin, requireStaff } = require('../middleware/rbac');

router.get('/active',       requireStaff, c.getActive);
router.get('/history',      requireStaff, c.getHistory);
router.get('/stats',        requireStaff, c.getStats);
router.get('/capacity',     requireStaff, c.getCapacity);
router.get('/:id',          requireStaff, c.getById);
router.get('/',             requireStaff, c.getAll);
router.post('/',            requireStaff, validateTrip, c.create);         // staff+
router.put('/:id',          requireStaff, c.update);                       // staff+
router.put('/:id/complete', requireStaff, c.complete);                     // staff+
router.put('/:id/cancel',   requireAdmin, c.cancel);         // admin only
router.delete('/:id',       requireAdmin, c.delete);         // admin only

module.exports = router;
