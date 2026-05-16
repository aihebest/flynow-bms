const router = require('express').Router();
const { requireRole, ROLES } = require('../middleware/rbac');
const ctrl = require('../controllers/packages');

router.get('/',      requireRole(ROLES.SALES, ROLES.MANAGER, ROLES.ADMIN, ROLES.FINANCE), ctrl.list);
router.get('/:id',   requireRole(ROLES.SALES, ROLES.MANAGER, ROLES.ADMIN, ROLES.FINANCE), ctrl.getById);
router.post('/',     requireRole(ROLES.MANAGER, ROLES.ADMIN), ctrl.create);
router.patch('/:id', requireRole(ROLES.MANAGER, ROLES.ADMIN), ctrl.update);
router.delete('/:id',requireRole(ROLES.MANAGER, ROLES.ADMIN), ctrl.remove);

module.exports = router;
