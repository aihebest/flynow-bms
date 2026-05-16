/**
 * webhooks.js — Public routes (no Entra ID auth required).
 * Paystack calls this endpoint when a payment is made.
 * The endpoint MUST verify the Paystack signature before processing.
 */
const router  = require('express').Router();
const crypto  = require('crypto');
const { query } = require('../config/database');
const notificationSvc = require('../services/notifications');
const zohoBooksService = require('../services/zohoBooks');
const logger  = require('../config/logger');

router.post('/paystack', async (req, res) => {
  // Verify signature
  const hash = crypto
    .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
    .update(req.body)           // raw buffer body
    .digest('hex');

  if (hash !== req.headers['x-paystack-signature']) {
    logger.warn('Paystack webhook: invalid signature');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const event = JSON.parse(req.body.toString());

  if (event.event === 'charge.success') {
    const ref  = event.data.reference;
    const paid = event.data.amount / 100; // Paystack amounts are in kobo

    // Find the invoice by Paystack reference
    const { rows } = await query(
      `SELECT id, customer_id, total_amount, amount_paid FROM invoices WHERE paystack_ref = $1`,
      [ref]
    );

    if (!rows.length) {
      logger.warn(`Paystack webhook: no invoice found for ref ${ref}`);
      return res.sendStatus(200); // acknowledge to avoid retries
    }

    const invoice = rows[0];
    const newAmountPaid = parseFloat(invoice.amount_paid) + paid;
    const newStatus = newAmountPaid >= parseFloat(invoice.total_amount) ? 'Paid' : 'Partially Paid';

    // Record payment
    await query(
      `INSERT INTO payments (invoice_id, amount, payment_method, reference, paystack_data)
       VALUES ($1, $2, 'Paystack Online', $3, $4)`,
      [invoice.id, paid, ref, JSON.stringify(event.data)]
    );

    // Update invoice
    await query(
      `UPDATE invoices SET amount_paid = $1, status = $2, paid_at = NOW(), updated_at = NOW()
       WHERE id = $3`,
      [newAmountPaid, newStatus, invoice.id]
    );

    // Notify finance team on Teams
    await notificationSvc.notifyTeams('finance', {
      title: `Payment Received — ${ref}`,
      text: `₦${paid.toLocaleString()} received for Invoice. Status → ${newStatus}.`,
    });

    // Sync to Zoho Books
    try {
      await zohoBooksService.markInvoicePaid(invoice.id, paid, ref);
    } catch (err) {
      logger.error('Zoho Books sync failed on payment webhook:', err.message);
    }

    logger.info(`Payment processed: ${ref}, amount: ${paid}, status: ${newStatus}`);
  }

  res.sendStatus(200);
});

module.exports = router;
