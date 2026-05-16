const router = require('express').Router();
const { requireRole, ROLES } = require('../middleware/rbac');
const ctrl = require('../controllers/staff');

// Staff profile (self)
router.get('/me',         ctrl.getMe);  // any authenticated user

// Leave management
router.post('/leave',                    ctrl.applyLeave);
router.get('/leave',                     ctrl.getMyLeave);
router.get('/leave/team',                requireRole(ROLES.MANAGER, ROLES.HR, ROLES.ADMIN), ctrl.getTeamLeave);
router.patch('/leave/:id/approve',       requireRole(ROLES.MANAGER, ROLES.ADMIN), ctrl.approveLeave);
router.patch('/leave/:id/reject',        requireRole(ROLES.MANAGER, ROLES.ADMIN), ctrl.rejectLeave);

// Staff admin (HR / Admin / Manager only)
router.get('/',           requireRole(ROLES.HR, ROLES.MANAGER, ROLES.ADMIN), ctrl.list);
router.get('/:id',        requireRole(ROLES.HR, ROLES.MANAGER, ROLES.ADMIN), ctrl.getById);
router.post('/',          requireRole(ROLES.HR, ROLES.ADMIN), ctrl.create);
router.patch('/:id',      requireRole(ROLES.HR, ROLES.ADMIN), ctrl.update);

module.exports = router;
