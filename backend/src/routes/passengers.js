const express               = require('express');
const router                = express.Router();
const c                     = require('../controllers/passengerController');
const { validatePassenger } = require('../middleware/validate');
const { requireAdmin, requireStaff } = require('../middleware/rbac');

router.get('/search',       requireStaff, c.search);
router.get('/trip/:tripId', requireStaff, c.getByTrip);
router.post('/',            requireStaff, validatePassenger, c.create);
router.post('/bulk',        requireStaff, c.bulkCreate);
router.delete('/:id',       requireAdmin, c.delete);   // admin only

module.exports = router;
