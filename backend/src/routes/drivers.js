// ============================================
// DRIVERS ROUTES v5 - with RBAC
// ============================================

const express            = require('express');
const router             = express.Router();
const c                  = require('../controllers/driverController');
const { validateDriver } = require('../middleware/validate');
const { requireAdmin, requireStaff } = require('../middleware/rbac');

router.get('/available',        requireStaff, c.getAvailable);
router.get('/search',           requireStaff, c.search);
router.get('/',                 requireStaff, c.getAll);
router.get('/:id',              requireStaff, c.getById);
router.post('/',                requireStaff, validateDriver, c.create);
router.put('/:id',              requireStaff, c.update);
router.put('/:id/availability', requireStaff, c.setAvailability);
router.delete('/:id',           requireAdmin, c.delete);

module.exports = router;
