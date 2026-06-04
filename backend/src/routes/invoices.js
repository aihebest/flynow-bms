const router = require('express').Router();
const { requireRole, ROLES } = require('../middleware/rbac');
const ctrl = require('../controllers/invoices');

router.get('/',       requireRole(ROLES.FINANCE, ROLES.MANAGER, ROLES.ADMIN), ctrl.list);
router.get('/:id',    requireRole(ROLES.FINANCE, ROLES.SALES, ROLES.MANAGER, ROLES.ADMIN), ctrl.getById);
router.post('/',      requireRole(ROLES.FINANCE, ROLES.SALES, ROLES.MANAGER, ROLES.ADMIN), ctrl.create);
router.patch('/:id',  requireRole(ROLES.FINANCE, ROLES.MANAGER, ROLES.ADMIN), ctrl.update);

// Send invoice to customer via Outlook + Paystack link
router.post('/:id/send', requireRole(ROLES.FINANCE, ROLES.SALES, ROLES.MANAGER, ROLES.ADMIN), ctrl.send);

// Manually record an offline payment (bank transfer / POS / cash)
router.post('/:id/payments', requireRole(ROLES.FINANCE, ROLES.MANAGER, ROLES.ADMIN), ctrl.recordPayment);

// Sync invoice to Zoho Books
router.post('/:id/sync-zoho', requireRole(ROLES.FINANCE, ROLES.ADMIN), ctrl.syncToZoho);

// ⚠️  ONE-TIME admin utility: delete all invoices (Admin only)
router.delete('/all/clear', requireRole(ROLES.ADMIN), ctrl.clearAll);

module.exports = router;
