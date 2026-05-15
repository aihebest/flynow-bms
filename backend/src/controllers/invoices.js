/**
 * FlyNow BMS — Invoices Controller
 */
const { query }  = require('../config/database');
const logger     = require('../config/logger');

async function list(req, res, next) {
  try {
    const { status = '', search = '', page = 1, limit = 25 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    const wheres = [];

    if (status) { params.push(status); wheres.push(`i.status = $${params.length}::invoice_status`); }
    if (search) {
      params.push(`%${search}%`);
      wheres.push(`(
        c.first_name     ILIKE $${params.length} OR
        c.last_name      ILIKE $${params.length} OR
        i.invoice_number ILIKE $${params.length}
      )`);
    }
    const where = wheres.length ? 'WHERE ' + wheres.join(' AND ') : '';
    params.push(parseInt(limit), offset);

    const r = await query(`
      SELECT i.id, i.invoice_number, i.status, i.total_amount, i.amount_paid,
             i.balance_due, i.currency, i.due_date, i.sent_at, i.paid_at, i.created_at,
             i.paystack_link, i.zoho_invoice_id,
             c.first_name, c.last_name, c.email
      FROM invoices i JOIN customers c ON c.id = i.customer_id
      ${where}
      ORDER BY i.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params);

    res.json({ invoices: r.rows });
  } catch (err) { next(err); }
}

async function getById(req, res, next) {
  try {
    const inv = await query(`
      SELECT i.*, c.first_name, c.last_name, c.email, c.phone
      FROM invoices i JOIN customers c ON c.id = i.customer_id
      WHERE i.id = $1
    `, [req.params.id]);
    if (!inv.rows.length) return res.status(404).json({ error: 'Invoice not found' });

    const lines = await query('SELECT * FROM invoice_line_items WHERE invoice_id = $1 ORDER BY id', [req.params.id]);
    const pmts  = await query('SELECT * FROM payments WHERE invoice_id = $1 ORDER BY paid_at DESC', [req.params.id]);

    res.json({ invoice: inv.rows[0], line_items: lines.rows, payments: pmts.rows });
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const {
      customer_id, booking_id, visa_id,
      subtotal, vat_rate = 7.5, discount_amount = 0, total_amount,
      currency = 'NGN', due_date, notes, line_items = [],
    } = req.body;

    if (!customer_id || !total_amount) {
      return res.status(400).json({ error: 'customer_id and total_amount are required' });
    }

    const vat_amount = (subtotal || total_amount) * (vat_rate / 100);

    const r = await query(`
      INSERT INTO invoices (customer_id, booking_id, visa_id, subtotal, vat_rate, vat_amount,
        discount_amount, total_amount, currency, due_date, notes, created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      RETURNING *
    `, [
      customer_id, booking_id || null, visa_id || null,
      subtotal || total_amount, vat_rate, vat_amount,
      discount_amount, total_amount, currency, due_date || null, notes || null, null,
    ]);

    const invoice = r.rows[0];

    for (const item of line_items) {
      await query(`
        INSERT INTO invoice_line_items (invoice_id, description, quantity, unit_price)
        VALUES ($1,$2,$3,$4)
      `, [invoice.id, item.description, item.quantity || 1, item.unit_price]);
    }

    res.status(201).json({ invoice });
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const f = req.body;
    const r = await query(`
      UPDATE invoices SET
        due_date        = COALESCE($1, due_date),
        notes           = COALESCE($2, notes),
        discount_amount = COALESCE($3, discount_amount),
        updated_at      = NOW()
      WHERE id = $4 RETURNING *
    `, [f.due_date, f.notes, f.discount_amount, req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Invoice not found' });
    res.json({ invoice: r.rows[0] });
  } catch (err) { next(err); }
}

// ─── Build HTML invoice email ──────────────────────────────────────────────────

function buildInvoiceEmail(invoice, lineItems, paymentUrl) {
  const sym = invoice.currency === 'NGN' ? '₦' : (invoice.currency + ' ');
  const fmt = (n) => sym + Number(n || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 });
  const fmtDate = (d) => d
    ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
    : '—';

  const lineItemsHtml = lineItems.map((li) => {
    const total = (parseFloat(li.quantity) || 0) * (parseFloat(li.unit_price) || 0);
    return `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;color:#374151;">${li.description}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;text-align:center;color:#6b7280;">${li.quantity}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;text-align:right;color:#6b7280;">${fmt(li.unit_price)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:600;color:#111827;">${fmt(total)}</td>
      </tr>`;
  }).join('');

  const vatRow = parseFloat(invoice.vat_rate) > 0
    ? `<div style="display:flex;justify-content:space-between;padding:6px 0;color:#6b7280;font-size:14px;">
         <span>VAT (${invoice.vat_rate}%)</span><span>${fmt(invoice.vat_amount)}</span>
       </div>` : '';

  const discountRow = parseFloat(invoice.discount_amount) > 0
    ? `<div style="display:flex;justify-content:space-between;padding:6px 0;color:#dc2626;font-size:14px;">
         <span>Discount</span><span>-${fmt(invoice.discount_amount)}</span>
       </div>` : '';

  const amountPaidRow = parseFloat(invoice.amount_paid) > 0
    ? `<div style="display:flex;justify-content:space-between;padding:6px 0;color:#16a34a;font-size:14px;">
         <span>Amount Paid</span><span>${fmt(invoice.amount_paid)}</span>
       </div>
       <div style="display:flex;justify-content:space-between;padding:8px 0;font-weight:700;color:#dc2626;border-top:1px solid #fee2e2;margin-top:4px;font-size:15px;">
         <span>Balance Due</span><span>${fmt(invoice.balance_due)}</span>
       </div>` : '';

  const payBtn = paymentUrl
    ? `<div style="padding:8px 40px 32px;text-align:center;">
         <a href="${paymentUrl}"
           style="display:inline-block;background:#003366;color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:8px;font-weight:700;font-size:15px;letter-spacing:0.3px;">
           Pay Online Now →
         </a>
         <p style="margin:10px 0 0;color:#9ca3af;font-size:12px;">Secure payment powered by Paystack</p>
       </div>` : '';

  const notesBlock = invoice.notes
    ? `<div style="padding:0 40px 32px;">
         <div style="background:#f8fafc;border-radius:8px;padding:16px;">
           <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Payment Instructions</p>
           <p style="margin:0;color:#374151;font-size:14px;white-space:pre-wrap;">${invoice.notes}</p>
         </div>
       </div>` : '';

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:620px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.07);">

    <!-- Header -->
    <div style="background:#003366;padding:32px 40px;">
      <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">Now Travel &amp; Tours Ltd</h1>
      <p style="margin:4px 0 0;color:#93c5fd;font-size:13px;">FlyNowTravels · flynow.com.ng</p>
    </div>

    <!-- Invoice meta -->
    <div style="padding:32px 40px 24px;border-bottom:1px solid #e2e8f0;">
      <h2 style="margin:0 0 20px;color:#003366;font-size:18px;font-weight:700;">Tax Invoice</h2>
      <div style="display:flex;justify-content:space-between;gap:24px;">
        <div>
          <p style="margin:0 0 4px;font-size:13px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:0.4px;">Bill To</p>
          <p style="margin:0 0 4px;color:#111827;font-weight:600;font-size:15px;">${invoice.first_name} ${invoice.last_name}</p>
          ${invoice.email ? `<p style="margin:0 0 2px;color:#6b7280;font-size:13px;">${invoice.email}</p>` : ''}
          ${invoice.phone ? `<p style="margin:0;color:#6b7280;font-size:13px;">${invoice.phone}</p>` : ''}
        </div>
        <div style="text-align:right;min-width:160px;">
          <p style="margin:0 0 2px;font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.4px;">Invoice No.</p>
          <p style="margin:0 0 12px;color:#003366;font-size:17px;font-weight:700;font-family:monospace;">${invoice.invoice_number}</p>
          <p style="margin:0 0 3px;color:#6b7280;font-size:12px;">Issue Date: ${fmtDate(invoice.created_at)}</p>
          ${invoice.due_date ? `<p style="margin:0;color:#dc2626;font-size:12px;font-weight:600;">Due: ${fmtDate(invoice.due_date)}</p>` : ''}
        </div>
      </div>
    </div>

    <!-- Line items -->
    <div style="padding:24px 40px 0;">
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="background:#f8fafc;">
            <th style="padding:10px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:#6b7280;font-weight:700;letter-spacing:0.5px;">Description</th>
            <th style="padding:10px 12px;text-align:center;font-size:11px;text-transform:uppercase;color:#6b7280;font-weight:700;letter-spacing:0.5px;width:50px;">Qty</th>
            <th style="padding:10px 12px;text-align:right;font-size:11px;text-transform:uppercase;color:#6b7280;font-weight:700;letter-spacing:0.5px;width:120px;">Unit Price</th>
            <th style="padding:10px 12px;text-align:right;font-size:11px;text-transform:uppercase;color:#6b7280;font-weight:700;letter-spacing:0.5px;width:120px;">Total</th>
          </tr>
        </thead>
        <tbody>${lineItemsHtml}</tbody>
      </table>
    </div>

    <!-- Totals -->
    <div style="padding:0 40px 24px;">
      <div style="margin-left:auto;max-width:260px;padding-top:16px;">
        <div style="display:flex;justify-content:space-between;padding:6px 0;color:#6b7280;font-size:14px;">
          <span>Subtotal</span><span>${fmt(invoice.subtotal)}</span>
        </div>
        ${vatRow}
        ${discountRow}
        <div style="display:flex;justify-content:space-between;padding:10px 0;font-weight:700;font-size:16px;color:#003366;border-top:2px solid #e2e8f0;margin-top:6px;">
          <span>Total</span><span>${fmt(invoice.total_amount)}</span>
        </div>
        ${amountPaidRow}
      </div>
    </div>

    ${payBtn}
    ${notesBlock}

    <!-- Footer -->
    <div style="padding:20px 40px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">
      <p style="margin:0;color:#9ca3af;font-size:12px;">Now Travel &amp; Tours Ltd · RC: [your RC number] · VAT: [your VAT number]</p>
      <p style="margin:4px 0 0;color:#d1d5db;font-size:11px;">This is an automatically generated invoice. Please do not reply to this email directly.</p>
    </div>

  </div>
</body>
</html>`;
}

// ─── Send invoice via Outlook + Paystack link ──────────────────────────────────

async function send(req, res, next) {
  try {
    // Fetch invoice + customer
    const invRes = await query(`
      SELECT i.*, c.first_name, c.last_name, c.email, c.phone
      FROM invoices i JOIN customers c ON c.id = i.customer_id
      WHERE i.id = $1
    `, [req.params.id]);
    if (!invRes.rows.length) return res.status(404).json({ error: 'Invoice not found' });

    const invoice = invRes.rows[0];

    if (!invoice.email) {
      return res.status(400).json({ error: 'Customer has no email address on record' });
    }
    if (['Paid', 'Cancelled', 'Refunded'].includes(invoice.status)) {
      return res.status(400).json({ error: `Cannot send a ${invoice.status} invoice` });
    }

    const linesRes  = await query('SELECT * FROM invoice_line_items WHERE invoice_id = $1 ORDER BY id', [req.params.id]);
    const lineItems = linesRes.rows;

    // ── 1. Generate Paystack payment link ──────────────────────────────────
    let paymentUrl  = null;
    let paystackRef = null;

    const sk = process.env.PAYSTACK_SECRET_KEY;
    if (sk && !sk.includes('YOUR_PAYSTACK')) {
      try {
        const paystack = require('../services/paystack');
        const balanceDue = parseFloat(invoice.balance_due || invoice.total_amount);
        const link = await paystack.createPaymentLink({
          email:        invoice.email,
          amountNGN:    balanceDue,
          reference:    `${invoice.invoice_number}-${Date.now()}`,
          customerName: `${invoice.first_name} ${invoice.last_name}`,
          metadata:     { invoice_id: invoice.id, customer_id: invoice.customer_id },
        });
        paymentUrl  = link.authorization_url;
        paystackRef = link.reference;
        logger.info(`Paystack link created for ${invoice.invoice_number}`);
      } catch (psErr) {
        logger.warn(`Paystack link failed (non-fatal): ${psErr.message}`);
      }
    } else {
      logger.warn('Paystack not configured — sending invoice without payment link');
    }

    // ── 2. Build HTML email ────────────────────────────────────────────────
    const htmlBody = buildInvoiceEmail(invoice, lineItems, paymentUrl);

    // ── 3. Send via Outlook Graph API ──────────────────────────────────────
    const ci = process.env.GRAPH_CLIENT_ID;
    if (!ci || ci === 'your-graph-app-client-id') {
      return res.status(501).json({
        error: 'Outlook (Graph API) not configured',
        detail: 'Add GRAPH_TENANT_ID, GRAPH_CLIENT_ID, GRAPH_CLIENT_SECRET and OUTLOOK_SENDER_EMAIL to backend/.env. ' +
                'Grant the app Mail.Send application permission.',
        payment_url: paymentUrl, // still return the Paystack link if we have one
      });
    }

    const { sendEmail } = require('../services/graph');
    await sendEmail({
      to:       invoice.email,
      subject:  `Invoice ${invoice.invoice_number} — Now Travel & Tours Ltd`,
      htmlBody,
    });
    logger.info(`Invoice ${invoice.invoice_number} emailed to ${invoice.email}`);

    // ── 4. Update invoice record ───────────────────────────────────────────
    await query(`
      UPDATE invoices SET
        status        = CASE WHEN status = 'Draft' THEN 'Sent'::invoice_status ELSE status END,
        sent_at       = COALESCE(sent_at, NOW()),
        paystack_ref  = COALESCE($1, paystack_ref),
        paystack_link = COALESCE($2, paystack_link),
        updated_at    = NOW()
      WHERE id = $3
    `, [paystackRef, paymentUrl, req.params.id]);

    // ── 5. Background Zoho sync (non-fatal) ───────────────────────────────
    try {
      const customer = { first_name: invoice.first_name, last_name: invoice.last_name, email: invoice.email };
      const zoho     = require('../services/zohoBooks');
      const zohoId   = await zoho.syncInvoice(invoice, lineItems, customer);
      if (zohoId) {
        await query('UPDATE invoices SET zoho_invoice_id = $1 WHERE id = $2', [zohoId, req.params.id]);
      }
    } catch (zohoErr) {
      logger.warn(`Zoho sync on send failed (non-fatal): ${zohoErr.message}`);
    }

    res.json({ success: true, payment_url: paymentUrl });
  } catch (err) { next(err); }
}

// ─── Record manual payment ─────────────────────────────────────────────────────

async function recordPayment(req, res, next) {
  try {
    const { amount, payment_method, reference, notes } = req.body;
    if (!amount || !payment_method) {
      return res.status(400).json({ error: 'amount and payment_method are required' });
    }

    const staffRes = await query('SELECT id FROM staff WHERE entra_oid = $1', [req.user.oid]);
    const staffId  = staffRes.rows[0]?.id || null;

    await query(`
      INSERT INTO payments (invoice_id, amount, payment_method, reference, notes, recorded_by)
      VALUES ($1,$2,$3::payment_method,$4,$5,$6)
    `, [req.params.id, amount, payment_method, reference || null, notes || null, staffId]);

    await query(`
      UPDATE invoices
      SET amount_paid = amount_paid + $1,
          status = CASE
            WHEN (amount_paid + $1) >= total_amount THEN 'Paid'::invoice_status
            WHEN (amount_paid + $1) > 0             THEN 'Partially Paid'::invoice_status
            ELSE status
          END,
          paid_at    = CASE WHEN (amount_paid + $1) >= total_amount THEN NOW() ELSE paid_at END,
          updated_at = NOW()
      WHERE id = $2
    `, [amount, req.params.id]);

    // Background Zoho payment sync
    try {
      const zoho = require('../services/zohoBooks');
      await zoho.markInvoicePaid(req.params.id, parseFloat(amount), reference || 'Manual payment');
    } catch (e) {
      logger.warn(`Zoho payment sync failed (non-fatal): ${e.message}`);
    }

    res.json({ success: true });
  } catch (err) { next(err); }
}

// ─── Sync to Zoho Books ────────────────────────────────────────────────────────

async function syncToZoho(req, res, next) {
  try {
    const zohoEnv = process.env.ZOHO_REFRESH_TOKEN;
    if (!zohoEnv || zohoEnv === 'YOUR_ZOHO_REFRESH_TOKEN') {
      return res.status(501).json({
        error: 'Zoho Books not configured',
        detail: 'Add ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN and ZOHO_ORGANIZATION_ID to backend/.env. ' +
                'Generate a refresh token via the Zoho API Console (Self Client → Scope: ZohoBooks.fullaccess.all).',
      });
    }

    const invRes = await query(`
      SELECT i.*, c.first_name, c.last_name, c.email
      FROM invoices i JOIN customers c ON c.id = i.customer_id
      WHERE i.id = $1
    `, [req.params.id]);
    if (!invRes.rows.length) return res.status(404).json({ error: 'Invoice not found' });

    const invoice   = invRes.rows[0];
    const linesRes  = await query('SELECT * FROM invoice_line_items WHERE invoice_id = $1 ORDER BY id', [req.params.id]);
    const lineItems = linesRes.rows;
    const customer  = { first_name: invoice.first_name, last_name: invoice.last_name, email: invoice.email };

    const zoho   = require('../services/zohoBooks');
    const zohoId = await zoho.syncInvoice(invoice, lineItems, customer);

    await query('UPDATE invoices SET zoho_invoice_id = $1, updated_at = NOW() WHERE id = $2', [zohoId, req.params.id]);

    logger.info(`Invoice ${invoice.invoice_number} synced to Zoho Books: ${zohoId}`);
    res.json({ success: true, zoho_invoice_id: zohoId });
  } catch (err) {
    logger.error('Zoho sync error:', err.message);
    next(err);
  }
}

module.exports = { list, getById, create, update, send, recordPayment, syncToZoho };
