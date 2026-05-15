/**
 * graph.js — Microsoft Graph API client.
 *
 * Authenticates as the backend application using client credentials
 * (app-only auth). Used for:
 *  - SharePoint document uploads / downloads
 *  - Sending email via Outlook (Mail.Send)
 *  - Creating Outlook calendar events (Calendars.ReadWrite)
 *  - Posting to Teams channels (ChannelMessage.Send or Incoming Webhook)
 */
const { ClientSecretCredential } = require('@azure/identity');
const { Client } = require('@microsoft/microsoft-graph-client');
const { TokenCredentialAuthenticationProvider } = require(
  '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials'
);
const logger = require('../config/logger');

// App-only credentials (backend service principal)
const credential = new ClientSecretCredential(
  process.env.GRAPH_TENANT_ID,
  process.env.GRAPH_CLIENT_ID,
  process.env.GRAPH_CLIENT_SECRET
);

const authProvider = new TokenCredentialAuthenticationProvider(credential, {
  scopes: ['https://graph.microsoft.com/.default'],
});

const graphClient = Client.initWithMiddleware({ authProvider });

// ─── SharePoint / OneDrive ──────────────────────────────────────────────────

const SITE_ID  = process.env.SHAREPOINT_SITE_ID;
const DRIVE_ID = process.env.SHAREPOINT_CUSTOMER_DOCS_DRIVE_ID;

/**
 * Upload a file to SharePoint.
 * @param {string} folderPath - e.g. "Customers/John-Doe-UUID/Visa-FNV-2026-00001"
 * @param {string} fileName   - e.g. "passport.pdf"
 * @param {Buffer} fileBuffer - File content
 * @returns {Object} Graph API driveItem
 */
async function uploadToSharePoint(folderPath, fileName, fileBuffer) {
  const encodedPath = encodeURIComponent(folderPath);
  const uploadUrl = `/sites/${SITE_ID}/drives/${DRIVE_ID}/root:/${encodedPath}/${fileName}:/content`;

  const item = await graphClient
    .api(uploadUrl)
    .put(fileBuffer);

  logger.info(`SharePoint upload: ${folderPath}/${fileName} → ${item.id}`);
  return item;
}

/**
 * Get a short-lived download URL for a SharePoint item.
 * @param {string} itemId - Graph API driveItem ID
 * @returns {string} Pre-authenticated download URL (valid ~1 hour)
 */
async function getDownloadUrl(itemId) {
  const item = await graphClient
    .api(`/sites/${SITE_ID}/drives/${DRIVE_ID}/items/${itemId}`)
    .select('@microsoft.graph.downloadUrl,name')
    .get();

  return item['@microsoft.graph.downloadUrl'];
}

/**
 * Delete a file from SharePoint.
 */
async function deleteSharePointItem(itemId) {
  await graphClient
    .api(`/sites/${SITE_ID}/drives/${DRIVE_ID}/items/${itemId}`)
    .delete();
}

// ─── Outlook Email ──────────────────────────────────────────────────────────

/**
 * Send an email from the shared FlyNowTravels mailbox via Outlook.
 * @param {Object} opts
 * @param {string} opts.to          - Recipient email
 * @param {string} opts.subject     - Email subject
 * @param {string} opts.htmlBody    - HTML body
 * @param {Array}  [opts.attachments] - [{ name, contentBytes (base64), contentType }]
 */
async function sendEmail({ to, subject, htmlBody, attachments = [] }) {
  const senderUpn = process.env.OUTLOOK_SENDER_EMAIL;

  const message = {
    subject,
    body: { contentType: 'HTML', content: htmlBody },
    toRecipients: [{ emailAddress: { address: to } }],
    ...(attachments.length > 0 && {
      attachments: attachments.map((a) => ({
        '@odata.type': '#microsoft.graph.fileAttachment',
        name: a.name,
        contentBytes: a.contentBytes,
        contentType: a.contentType,
      })),
    }),
  };

  await graphClient
    .api(`/users/${senderUpn}/sendMail`)
    .post({ message, saveToSentItems: true });

  logger.info(`Email sent to ${to} — subject: ${subject}`);
}

// ─── Outlook Calendar ───────────────────────────────────────────────────────

/**
 * Create an Outlook calendar event for a staff member.
 * @param {string} staffEmail  - Staff's M365 email
 * @param {Object} eventDetails
 */
async function createCalendarEvent(staffEmail, { subject, start, end, bodyText, location }) {
  const event = {
    subject,
    body: { contentType: 'Text', content: bodyText || '' },
    start: { dateTime: start, timeZone: 'Africa/Lagos' },
    end:   { dateTime: end,   timeZone: 'Africa/Lagos' },
    ...(location && { location: { displayName: location } }),
  };

  const created = await graphClient
    .api(`/users/${staffEmail}/events`)
    .post(event);

  logger.info(`Calendar event created for ${staffEmail}: ${subject}`);
  return created;
}

module.exports = {
  graphClient,
  uploadToSharePoint,
  getDownloadUrl,
  deleteSharePointItem,
  sendEmail,
  createCalendarEvent,
};
