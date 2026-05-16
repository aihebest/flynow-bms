/**
 * notifications.js — Centralised notification dispatcher.
 *
 * Sends alerts to:
 *  1. Microsoft Teams channels (via Incoming Webhook)
 *  2. Customer WhatsApp / SMS (via Termii)
 *  3. Customer email (via Microsoft Graph / Outlook)
 */
const axios  = require('axios');
const { sendEmail } = require('./graph');
const termii = require('./termii');
const logger = require('../config/logger');

// Map of channel names to environment variable webhook URLs
const TEAMS_WEBHOOKS = {
  bookings:   process.env.TEAMS_BOOKINGS_WEBHOOK,
  visa:       process.env.TEAMS_VISA_WEBHOOK,
  finance:    process.env.TEAMS_FINANCE_WEBHOOK,
  hr:         process.env.TEAMS_HR_WEBHOOK,
  management: process.env.TEAMS_MANAGEMENT_WEBHOOK,
};

/**
 * Post an Adaptive Card notification to a Teams channel.
 * @param {string} channel - One of: bookings, visa, finance, hr, management
 * @param {Object} opts    - { title, text, facts: [{name, value}] }
 */
async function notifyTeams(channel, { title, text, facts = [] }) {
  const webhookUrl = TEAMS_WEBHOOKS[channel];
  if (!webhookUrl) {
    logger.warn(`Teams webhook not configured for channel: ${channel}`);
    return;
  }

  const payload = {
    '@type': 'MessageCard',
    '@context': 'http://schema.org/extensions',
    themeColor: '003366',
    summary: title,
    sections: [{
      activityTitle: `**${title}**`,
      activitySubtitle: text,
      facts: facts.map(({ name, value }) => ({ name, value })),
    }],
  };

  try {
    await axios.post(webhookUrl, payload, { timeout: 5000 });
    logger.debug(`Teams notification sent to #${channel}: ${title}`);
  } catch (err) {
    logger.error(`Teams notification failed (${channel}):`, err.message);
  }
}

/**
 * Send a WhatsApp message to a customer via Termii.
 * Falls back to SMS if WhatsApp fails.
 */
async function notifyCustomerWhatsApp(phone, message) {
  try {
    await termii.sendWhatsApp(phone, message);
  } catch (err) {
    logger.warn(`WhatsApp failed for ${phone}, falling back to SMS:`, err.message);
    await termii.sendSMS(phone, message);
  }
}

/**
 * Notify customer of a visa stage change.
 */
async function notifyVisaStageChange(customer, visa, stage) {
  const messages = {
    'Checklist Sent':
      `Hi ${customer.first_name}, your visa document checklist for ${visa.country} has been sent to your email. Please review and submit your documents at your earliest convenience. — FlyNowTravels`,
    'Documents Received':
      `Hi ${customer.first_name}, we have received your documents for your ${visa.country} visa application (Ref: ${visa.reference}). We will review them shortly. — FlyNowTravels`,
    'Submitted to Embassy':
      `Hi ${customer.first_name}, your ${visa.country} visa application (Ref: ${visa.reference}) has been submitted to the embassy. We will update you on the outcome. — FlyNowTravels`,
    'Appointment Booked':
      `Hi ${customer.first_name}, your embassy appointment for your ${visa.country} visa (Ref: ${visa.reference}) has been booked. Check your email for details. — FlyNowTravels`,
    'Approved':
      `Great news ${customer.first_name}! Your ${visa.country} visa application (Ref: ${visa.reference}) has been APPROVED. Please contact us to arrange collection. — FlyNowTravels`,
    'Rejected':
      `Hi ${customer.first_name}, unfortunately your ${visa.country} visa application (Ref: ${visa.reference}) was not approved at this time. Please contact us to discuss next steps. — FlyNowTravels`,
    'Ready for Collection':
      `Hi ${customer.first_name}, your ${visa.country} visa (Ref: ${visa.reference}) is ready for collection at our office. — FlyNowTravels`,
    'Delivered':
      `Hi ${customer.first_name}, your ${visa.country} visa documents have been delivered. Safe travels! — FlyNowTravels`,
  };

  const msg = messages[stage];
  if (!msg) return;

  const contactPhone = customer.whatsapp || customer.phone;
  if (contactPhone) await notifyCustomerWhatsApp(contactPhone, msg);
  if (customer.email) {
    await sendEmail({
      to: customer.email,
      subject: `Visa Update: ${visa.country} Application (${visa.reference})`,
      htmlBody: `<p>${msg.replace(/\n/g, '<br>')}</p>`,
    }).catch((err) => logger.error('Email notification failed:', err.message));
  }
}

/**
 * Notify customer of a booking confirmation.
 */
async function notifyBookingConfirmed(customer, booking) {
  const msg = `Hi ${customer.first_name}, your booking (Ref: ${booking.reference}) has been confirmed! ` +
    `Service: ${booking.service_type}. We will send your ticket/documents shortly. — FlyNowTravels`;

  if (customer.whatsapp || customer.phone) {
    await notifyCustomerWhatsApp(customer.whatsapp || customer.phone, msg);
  }

  await notifyTeams('bookings', {
    title: `Booking Confirmed — ${booking.reference}`,
    text: `${customer.first_name} ${customer.last_name} | ${booking.service_type} | ${booking.destination}`,
    facts: [
      { name: 'Customer', value: `${customer.first_name} ${customer.last_name}` },
      { name: 'Service',  value: booking.service_type },
      { name: 'Amount',   value: `₦${parseFloat(booking.selling_price || 0).toLocaleString()}` },
    ],
  });
}

module.exports = {
  notifyTeams,
  notifyCustomerWhatsApp,
  notifyVisaStageChange,
  notifyBookingConfirmed,
};
