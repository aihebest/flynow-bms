const router = require('express').Router();
const { authenticate } = require('../middleware/auth');

// All routes below require a valid Entra ID token
router.use(authenticate);

router.use('/customers',  require('./customers'));
router.use('/bookings',   require('./bookings'));
router.use('/visas',      require('./visas'));
router.use('/invoices',   require('./invoices'));
router.use('/documents',  require('./documents'));
router.use('/staff',      require('./staff'));
router.use('/dashboard',  require('./dashboard'));
router.use('/packages',   require('./packages'));
// NOTE: /webhooks/paystack is mounted directly in app.js (public, no Entra ID auth)

module.exports = router;
