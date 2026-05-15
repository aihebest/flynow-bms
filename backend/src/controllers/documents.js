/**
 * FlyNow BMS — Documents Controller (SharePoint-backed via Microsoft Graph)
 */
const { query }  = require('../config/database');
const logger     = require('../config/logger');
const graphSvc   = require('../services/graph');

// ─── Config check ─────────────────────────────────────────────────────────────

function isGraphConfigured() {
  const t  = process.env.GRAPH_TENANT_ID;
  const ci = process.env.GRAPH_CLIENT_ID;
  const cs = process.env.GRAPH_CLIENT_SECRET;
  const si = process.env.SHAREPOINT_SITE_ID;
  const di = process.env.SHAREPOINT_CUSTOMER_DOCS_DRIVE_ID;
  const placeholders = ['your-tenant-id','your-graph-app-client-id','your-graph-app-client-secret',
                        'your-sharepoint-site-id','your-drive-id'];
  return !!(t && ci && cs && si && di &&
    ![t, ci, cs, si, di].some(v => placeholders.includes(v)));
}

// ─── SharePoint folder path builder ──────────────────────────────────────────

async function buildFolderPath(customer_id, visa_id, booking_id, staff_id, category) {
  if (customer_id) {
    const cr  = await query('SELECT first_name, last_name FROM customers WHERE id = $1', [customer_id]);
    const c   = cr.rows[0];
    const slug = c
      ? `${c.first_name}-${c.last_name}`.replace(/[^a-zA-Z0-9\-]/g, '-')
      : customer_id.slice(0, 8);

    if (visa_id) {
      const vr  = await query('SELECT reference FROM visa_applications WHERE id = $1', [visa_id]);
      const ref = vr.rows[0]?.reference || visa_id.slice(0, 8);
      return `Customers/${slug}/Visa-${ref}`;
    }
    if (booking_id) {
      const br  = await query('SELECT reference FROM bookings WHERE id = $1', [booking_id]);
      const ref = br.rows[0]?.reference || booking_id.slice(0, 8);
      return `Customers/${slug}/Booking-${ref}`;
    }
    return `Customers/${slug}/${category.replace(/\s+/g, '-')}`;
  }
  if (staff_id) {
    const sr   = await query('SELECT full_name FROM staff WHERE id = $1', [staff_id]);
    const name = (sr.rows[0]?.full_name || staff_id.slice(0, 8)).replace(/[^a-zA-Z0-9\-]/g, '-');
    return `Staff/${name}`;
  }
  return `Company/${category.replace(/\s+/g, '-')}`;
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

async function list(req, res, next) {
  try {
    const { customer_id, visa_id, booking_id, staff_id, category } = req.query;
    const params = [];
    const wheres = [];

    if (customer_id) { params.push(customer_id); wheres.push(`d.customer_id = $${params.length}`); }
    if (visa_id)     { params.push(visa_id);     wheres.push(`d.visa_id = $${params.length}`); }
    if (booking_id)  { params.push(booking_id);  wheres.push(`d.booking_id = $${params.length}`); }
    if (staff_id)    { params.push(staff_id);    wheres.push(`d.staff_id = $${params.length}`); }
    if (category)    { params.push(category);    wheres.push(`d.category = $${params.length}::doc_category`); }

    const where = wheres.length ? 'WHERE ' + wheres.join(' AND ') : '';

    const r = await query(`
      SELECT d.*, s.full_name AS uploaded_by_name
      FROM documents d LEFT JOIN staff s ON s.id = d.uploaded_by
      ${where}
      ORDER BY d.created_at DESC
    `, params);

    res.json({ documents: r.rows });
  } catch (err) { next(err); }
}

async function getById(req, res, next) {
  try {
    const r = await query('SELECT * FROM documents WHERE id = $1', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Document not found' });
    res.json({ document: r.rows[0] });
  } catch (err) { next(err); }
}

async function upload(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    if (!isGraphConfigured()) {
      return res.status(501).json({
        error: 'SharePoint not configured',
        detail: 'Add GRAPH_TENANT_ID, GRAPH_CLIENT_ID, GRAPH_CLIENT_SECRET, ' +
                'SHAREPOINT_SITE_ID, SHAREPOINT_CUSTOMER_DOCS_DRIVE_ID to backend/.env. ' +
                'Grant the app Files.ReadWrite.All and Sites.ReadWrite.All application permissions.',
      });
    }

    const { customer_id, visa_id, booking_id, staff_id, category, expires_at, notes } = req.body;
    if (!category) return res.status(400).json({ error: 'category is required' });

    const staffRes   = await query('SELECT id FROM staff WHERE entra_oid = $1', [req.user.oid]);
    const uploadedBy = staffRes.rows[0]?.id || null;

    const folderPath = await buildFolderPath(customer_id, visa_id, booking_id, staff_id, category);
    logger.info(`Uploading ${req.file.originalname} to SharePoint: ${folderPath}`);

    const item = await graphSvc.uploadToSharePoint(folderPath, req.file.originalname, req.file.buffer);

    const r = await query(`
      INSERT INTO documents (
        category, customer_id, visa_id, booking_id, staff_id,
        file_name, file_size_kb, mime_type,
        sharepoint_site_id, sharepoint_drive_id, sharepoint_item_id, sharepoint_web_url,
        expires_at, notes, uploaded_by
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
      RETURNING *
    `, [
      category,
      customer_id || null, visa_id || null, booking_id || null, staff_id || null,
      req.file.originalname,
      Math.ceil(req.file.size / 1024),
      req.file.mimetype,
      process.env.SHAREPOINT_SITE_ID,
      process.env.SHAREPOINT_CUSTOMER_DOCS_DRIVE_ID,
      item.id,
      item.webUrl,
      expires_at || null,
      notes      || null,
      uploadedBy,
    ]);

    res.status(201).json({ document: r.rows[0] });
  } catch (err) { next(err); }
}

async function getDownloadUrl(req, res, next) {
  try {
    const r = await query('SELECT sharepoint_item_id, file_name FROM documents WHERE id = $1', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Document not found' });

    const { sharepoint_item_id, file_name } = r.rows[0];
    if (!sharepoint_item_id) {
      return res.status(400).json({ error: 'No SharePoint item linked to this document record' });
    }
    if (!isGraphConfigured()) {
      return res.status(501).json({ error: 'SharePoint not configured — add Graph API credentials to .env' });
    }

    const url = await graphSvc.getDownloadUrl(sharepoint_item_id);
    res.json({ download_url: url, file_name });
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    const r = await query('SELECT sharepoint_item_id FROM documents WHERE id = $1', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Document not found' });

    const { sharepoint_item_id } = r.rows[0];

    if (sharepoint_item_id && isGraphConfigured()) {
      try {
        await graphSvc.deleteSharePointItem(sharepoint_item_id);
        logger.info(`Deleted SharePoint item: ${sharepoint_item_id}`);
      } catch (spErr) {
        logger.warn(`SharePoint delete failed for ${sharepoint_item_id}: ${spErr.message}`);
      }
    }

    await query('DELETE FROM documents WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { next(err); }
}

module.exports = { list, getById, upload, getDownloadUrl, remove };
