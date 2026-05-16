const axios  = require('axios');
const logger = require('../config/logger');

const BASE_URL  = 'https://api.ng.termii.com/api';
const API_KEY   = process.env.TERMII_API_KEY;
const SENDER_ID = process.env.TERMII_SENDER_ID || 'FlyNow';

/**
 * Normalise a phone number to international format for Termii.
 * Accepts: 08012345678, +2348012345678, 2348012345678
 */
function normalisePhone(phone) {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('234')) return digits;
  if (digits.startsWith('0'))   return `234${digits.slice(1)}`;
  return digits;
}

/**
 * Send an SMS message via Termii.
 */
async function sendSMS(phone, message) {
  const to = normalisePhone(phone);
  const { data } = await axios.post(`${BASE_URL}/sms/send`, {
    to,
    from: SENDER_ID,
    sms: message,
    type: 'plain',
    channel: 'generic',
    api_key: API_KEY,
  });

  if (data.code !== 'ok') {
    logger.warn(`Termii SMS failed to ${to}:`, data.message);
    throw new Error(`Termii SMS failed: ${data.message}`);
  }

  logger.info(`SMS sent to ${to}`);
  return data;
}

/**
 * Send a WhatsApp message via Termii.
 */
async function sendWhatsApp(phone, message) {
  const to = normalisePhone(phone);
  const { data } = await axios.post(`${BASE_URL}/sms/send`, {
    to,
    from: SENDER_ID,
    sms: message,
    type: 'plain',
    channel: 'whatsapp',
    api_key: API_KEY,
  });

  if (data.code !== 'ok') {
    logger.warn(`Termii WhatsApp failed to ${to}:`, data.message);
    throw new Error(`Termii WhatsApp failed: ${data.message}`);
  }

  logger.info(`WhatsApp message sent to ${to}`);
  return data;
}

/**
 * Send an OTP via Termii (for customer portal login).
 */
async function sendOTP(phone) {
  const to = normalisePhone(phone);
  const { data } = await axios.post(`${BASE_URL}/sms/otp/send`, {
    api_key: API_KEY,
    message_type: 'NUMERIC',
    to,
    from: SENDER_ID,
    channel: 'generic',
    pin_attempts: 3,
    pin_time_to_live: 5, // minutes
    pin_length: 6,
    pin_placeholder: '< 1234 >',
    message_text: 'Your FlyNowTravels login code is < 1234 >. Valid for 5 minutes.',
    pin_type: 'NUMERIC',
  });

  if (!data.pinId) throw new Error(`Termii OTP send failed: ${JSON.stringify(data)}`);
  logger.info(`OTP sent to ${to}`);
  return { pinId: data.pinId };
}

/**
 * Verify an OTP pin.
 */
async function verifyOTP(pinId, pin) {
  const { data } = await axios.post(`${BASE_URL}/sms/otp/verify`, {
    api_key: API_KEY,
    pin_id: pinId,
    pin,
  });

  return data.verified === true;
}

module.exports = { sendSMS, sendWhatsApp, sendOTP, verifyOTP, normalisePhone };
