const router = require('express').Router();
const { requireRole, ROLES } = require('../middleware/rbac');
const {
  listCustomers, getCustomer, createCustomer, updateCustomer,
  logInteraction, getInteractions,
} = require('../controllers/customers');

// GET  /api/customers          — list / search customers
router.get('/',    requireRole(ROLES.SALES, ROLES.VISA, ROLES.MANAGER, ROLES.ADMIN), listCustomers);

// GET  /api/customers/:id      — get single customer with full history
router.get('/:id', requireRole(ROLES.SALES, ROLES.VISA, ROLES.MANAGER, ROLES.ADMIN), getCustomer);

// POST /api/customers          — create customer
router.post('/',   requireRole(ROLES.SALES, ROLES.MANAGER, ROLES.ADMIN), createCustomer);

// PATCH /api/customers/:id     — update customer
router.patch('/:id', requireRole(ROLES.SALES, ROLES.MANAGER, ROLES.ADMIN), updateCustomer);

// POST /api/customers/:id/interactions  — log a call/email/walk-in
router.post('/:id/interactions', requireRole(ROLES.SALES, ROLES.VISA, ROLES.MANAGER, ROLES.ADMIN), logInteraction);

// GET  /api/customers/:id/interactions  — list interactions
router.get('/:id/interactions', requireRole(ROLES.SALES, ROLES.VISA, ROLES.MANAGER, ROLES.ADMIN), getInteractions);

module.exports = router;
