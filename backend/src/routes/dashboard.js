const router = require('express').Router();
const { requireRole, ROLES } = require('../middleware/rbac');
const ctrl = require('../controllers/dashboard');

// Management snapshot — today's bookings, visa pipeline, revenue, alerts
router.get('/summary',          requireRole(ROLES.MANAGER, ROLES.ADMIN, ROLES.FINANCE), ctrl.summary);
router.get('/bookings-chart',   requireRole(ROLES.MANAGER, ROLES.ADMIN), ctrl.bookingsChart);
router.get('/visa-pipeline',    requireRole(ROLES.MANAGER, ROLES.ADMIN, ROLES.VISA), ctrl.visaPipeline);
router.get('/revenue',          requireRole(ROLES.MANAGER, ROLES.ADMIN, ROLES.FINANCE), ctrl.revenue);
router.get('/expiry-alerts',    requireRole(ROLES.MANAGER, ROLES.ADMIN, ROLES.SALES, ROLES.VISA), ctrl.expiryAlerts);

module.exports = router;
