const axios  = require('axios');
const logger = require('../config/logger');

const BASE_URL = 'https://api.paystack.co';
const HEADERS  = {
  Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
  'Content-Type': 'application/json',
};

/**
 * Create a Paystack payment link (hosted payment page).
 * @param {Object} opts
 * @param {string} opts.email        - Customer email
 * @param {number} opts.amountNGN    - Amount in Naira (converted to kobo internally)
 * @param {string} opts.reference    - Unique invoice reference (FNI-...)
 * @param {string} opts.customerName
 * @param {Object} opts.metadata     - Any additional data (invoiceId, customerId, etc.)
 * @returns {{ authorization_url, access_code, reference }}
 */
async function createPaymentLink({ email, amountNGN, reference, customerName, metadata = {} }) {
  const { data } = await axios.post(
    `${BASE_URL}/transaction/initialize`,
    {
      email,
      amount: Math.round(amountNGN * 100), // kobo
      reference,
      metadata: {
        ...metadata,
        customer_name: customerName,
        cancel_action: process.env.FRONTEND_URL,
      },
      callback_url: `${process.env.FRONTEND_URL}/payment/callback`,
      currency: 'NGN',
    },
    { headers: HEADERS }
  );

  if (!data.status) throw new Error(`Paystack initialization failed: ${data.message}`);

  logger.info(`Paystack link created: ${reference}`);
  return data.data; // { authorization_url, access_code, reference }
}

/**
 * Verify a Paystack transaction by reference.
 * @param {string} reference
 * @returns {Object} Transaction data
 */
async function verifyTransaction(reference) {
  const { data } = await axios.get(
    `${BASE_URL}/transaction/verify/${encodeURIComponent(reference)}`,
    { headers: HEADERS }
  );

  if (!data.status) throw new Error(`Paystack verification failed: ${data.message}`);
  return data.data;
}

/**
 * Initiate a refund for a previously successful charge.
 * @param {string} transactionRef
 * @param {number} amountNGN  - Partial or full refund amount
 */
async function initiateRefund(transactionRef, amountNGN) {
  const { data } = await axios.post(
    `${BASE_URL}/refund`,
    { transaction: transactionRef, amount: Math.round(amountNGN * 100) },
    { headers: HEADERS }
  );

  if (!data.status) throw new Error(`Paystack refund failed: ${data.message}`);
  logger.info(`Paystack refund initiated: ${transactionRef}, amount: ₦${amountNGN}`);
  return data.data;
}

module.exports = { createPaymentLink, verifyTransaction, initiateRefund };
