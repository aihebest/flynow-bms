/**
 * zohoBooks.js — Sync invoices and payments to Zoho Books.
 *
 * Uses OAuth 2.0 with a long-lived refresh token.
 * Generate once via Zoho API Console → Self Client:
 *   Scope: ZohoBooks.fullaccess.all
 *   Duration: Self Client (permanent refresh token)
 */
const axios  = require('axios');
const logger = require('../config/logger');

const ORG_ID = () => process.env.ZOHO_ORGANIZATION_ID;
const BASE   = 'https://www.zohoapis.com/books/v3';

let cachedToken  = null;
let tokenExpiry  = 0;

async function getAccessToken() {
  if (cachedToken && Date.now() < tokenExpiry - 60_000) return cachedToken;

  const { data } = await axios.post(
    'https://accounts.zoho.com/oauth/v2/token',
    new URLSearchParams({
      refresh_token: process.env.ZOHO_REFRESH_TOKEN,
      client_id:     process.env.ZOHO_CLIENT_ID,
      client_secret: process.env.ZOHO_CLIENT_SECRET,
      grant_type:    'refresh_token',
    }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );

  if (!data.access_token) throw new Error(`Zoho token refresh failed: ${JSON.stringify(data)}`);

  cachedToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in * 1000);
  return cachedToken;
}

async function authHeaders() {
  const token = await getAccessToken();
  return {
    Authorization:  `Zoho-oauthtoken ${token}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Create or update an invoice in Zoho Books.
 * Returns the Zoho invoice_id string.
 */
async function syncInvoice(invoice, lineItems, customer) {
  const hdrs = await authHeaders();

  const payload = {
    customer_name:    `${customer.first_name} ${customer.last_name}`,
    email:            customer.email,
    reference_number: invoice.invoice_number,
    date:             new Date(invoice.created_at).toISOString().split('T')[0],
    ...(invoice.due_date && {
      due_date: new Date(invoice.due_date).toISOString().split('T')[0],
    }),
    line_items: lineItems.map((li) => ({
      name:     li.description,
      quantity: parseFloat(li.quantity)   || 1,
      rate:     parseFloat(li.unit_price) || 0,
    })),
    ...(invoice.notes && { notes: invoice.notes }),
    terms: 'Payment due as per invoice date.',
  };

  const orgParam = `?organization_id=${ORG_ID()}`;

  if (invoice.zoho_invoice_id) {
    // Update existing
    const { data } = await axios.put(
      `${BASE}/invoices/${invoice.zoho_invoice_id}${orgParam}`,
      payload,
      { headers: hdrs }
    );
    if (data.code !== 0) throw new Error(`Zoho update failed: ${data.message}`);
    logger.info(`Zoho Books invoice updated: ${invoice.invoice_number} → ${data.invoice.invoice_id}`);
    return data.invoice.invoice_id;
  }

  // Create new
  const { data } = await axios.post(
    `${BASE}/invoices${orgParam}`,
    payload,
    { headers: hdrs }
  );
  if (data.code !== 0) throw new Error(`Zoho create failed: ${data.message}`);
  logger.info(`Zoho Books invoice created: ${invoice.invoice_number} → ${data.invoice.invoice_id}`);
  return data.invoice.invoice_id;
}

/**
 * Record a payment against a Zoho Books invoice.
 */
async function markInvoicePaid(invoiceId, amount, paymentRef) {
  const { query } = require('../config/database');
  const { rows }  = await query('SELECT zoho_invoice_id FROM invoices WHERE id = $1', [invoiceId]);
  if (!rows.length || !rows[0].zoho_invoice_id) return; // Not synced to Zoho yet

  const hdrs = await authHeaders();
  const orgParam = `?organization_id=${ORG_ID()}`;

  const payload = {
    payment_mode:     'cash',
    amount:           amount,
    date:             new Date().toISOString().split('T')[0],
    reference_number: paymentRef,
    invoices: [{ invoice_id: rows[0].zoho_invoice_id, amount_applied: amount }],
  };

  const { data } = await axios.post(
    `${BASE}/customerpayments${orgParam}`,
    payload,
    { headers: hdrs }
  );
  if (data.code !== 0) throw new Error(`Zoho payment failed: ${data.message}`);

  logger.info(`Zoho Books payment recorded: ${paymentRef} — ₦${amount}`);
}

module.exports = { syncInvoice, markInvoicePaid };
