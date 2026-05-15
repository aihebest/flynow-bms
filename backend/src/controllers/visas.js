/**
 * FlyNow BMS — Visa Applications Controller
 */
const { query } = require('../config/database');
const logger    = require('../config/logger');

async function list(req, res, next) {
  try {
    const { stage = '', assigned_to = '', search = '', page = 1, limit = 25 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    const wheres = [];

    if (stage)       { params.push(stage);       wheres.push(`v.stage = $${params.length}::visa_stage`); }
    if (assigned_to) { params.push(assigned_to); wheres.push(`v.assigned_to = $${params.length}`); }
    if (search) {
      params.push(`%${search}%`);
      wheres.push(`(
        c.first_name ILIKE $${params.length} OR
        c.last_name  ILIKE $${params.length} OR
        v.reference  ILIKE $${params.length} OR
        co.name      ILIKE $${params.length} OR
        vt.name      ILIKE $${params.length}
      )`);
    }

    const where = wheres.length ? 'WHERE ' + wheres.join(' AND ') : '';
    params.push(parseInt(limit), offset);

    const r = await query(`
      SELECT v.id, v.reference, v.stage, v.appointment_date, v.intended_travel_date,
             v.applicant_count, v.created_at, v.updated_at,
             c.first_name, c.last_name, c.phone,
             vt.name AS visa_type_name, co.name AS country_name,
             s.full_name AS assigned_to_name
      FROM visa_applications v
      JOIN customers c ON c.id = v.customer_id
      JOIN visa_types vt ON vt.id = v.visa_type_id
      JOIN countries co ON co.code = vt.country_code
      LEFT JOIN staff s ON s.id = v.assigned_to
      ${where}
      ORDER BY v.updated_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params);

    res.json({ visas: r.rows, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) { next(err); }
}

async function getById(req, res, next) {
  try {
    const r = await query(`
      SELECT v.*, c.first_name, c.last_name, c.email, c.phone, c.passport_number, c.passport_expiry,
             vt.name AS visa_type_name, co.name AS country_name,
             s.full_name AS assigned_to_name
      FROM visa_applications v
      JOIN customers c  ON c.id  = v.customer_id
      JOIN visa_types vt ON vt.id = v.visa_type_id
      JOIN countries co ON co.code = vt.country_code
      LEFT JOIN staff s ON s.id = v.assigned_to
      WHERE v.id = $1
    `, [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Visa application not found' });

    const history = await query(`
      SELECT vh.*, s.full_name AS changed_by_name
      FROM visa_stage_history vh LEFT JOIN staff s ON s.id = vh.changed_by
      WHERE vh.visa_id = $1 ORDER BY vh.changed_at ASC
    `, [req.params.id]);

    res.json({ visa: r.rows[0], history: history.rows });
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const {
      customer_id, booking_id, visa_type_id, assigned_to,
      applicant_count = 1, travel_purpose, intended_travel_date,
      service_fee, embassy_fee, courier_fee, currency = 'NGN', internal_notes,
    } = req.body;

    if (!customer_id || !visa_type_id) {
      return res.status(400).json({ error: 'customer_id and visa_type_id are required' });
    }

    const r = await query(`
      INSERT INTO visa_applications (
        customer_id, booking_id, visa_type_id, assigned_to,
        applicant_count, travel_purpose, intended_travel_date,
        service_fee, embassy_fee, courier_fee, currency, internal_notes, created_by
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      RETURNING *
    `, [
      customer_id, booking_id || null, visa_type_id, assigned_to || null,
      applicant_count, travel_purpose || null, intended_travel_date || null,
      service_fee || null, embassy_fee || null, courier_fee || null,
      currency, internal_notes || null, null,
    ]);

    res.status(201).json({ visa: r.rows[0] });
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const f = req.body;
    const r = await query(`
      UPDATE visa_applications SET
        assigned_to          = COALESCE($1, assigned_to),
        travel_purpose       = COALESCE($2, travel_purpose),
        intended_travel_date = COALESCE($3, intended_travel_date),
        embassy_ref          = COALESCE($4, embassy_ref),
        appointment_date     = COALESCE($5, appointment_date),
        appointment_time     = COALESCE($6, appointment_time),
        appointment_notes    = COALESCE($7, appointment_notes),
        outcome_date         = COALESCE($8, outcome_date),
        visa_valid_from      = COALESCE($9, visa_valid_from),
        visa_valid_to        = COALESCE($10, visa_valid_to),
        rejection_reason     = COALESCE($11, rejection_reason),
        service_fee          = COALESCE($12, service_fee),
        embassy_fee          = COALESCE($13, embassy_fee),
        internal_notes       = COALESCE($14, internal_notes),
        updated_at           = NOW()
      WHERE id = $15 RETURNING *
    `, [
      f.assigned_to, f.travel_purpose, f.intended_travel_date,
      f.embassy_ref, f.appointment_date, f.appointment_time, f.appointment_notes,
      f.outcome_date, f.visa_valid_from, f.visa_valid_to, f.rejection_reason,
      f.service_fee, f.embassy_fee, f.internal_notes,
      req.params.id,
    ]);
    if (!r.rows.length) return res.status(404).json({ error: 'Visa application not found' });
    res.json({ visa: r.rows[0] });
  } catch (err) { next(err); }
}

async function updateStage(req, res, next) {
  try {
    const { stage, note } = req.body;
    if (!stage) return res.status(400).json({ error: 'stage is required' });

    const existing = await query('SELECT stage FROM visa_applications WHERE id = $1', [req.params.id]);
    if (!existing.rows.length) return res.status(404).json({ error: 'Visa application not found' });

    const oldStage = existing.rows[0].stage;

    await query(`
      UPDATE visa_applications SET stage = $1::visa_stage, updated_at = NOW() WHERE id = $2
    `, [stage, req.params.id]);

    // Record history
    const staffRes = await query('SELECT id FROM staff WHERE entra_oid = $1', [req.user.oid]);
    const staffId  = staffRes.rows[0]?.id || null;

    await query(`
      INSERT INTO visa_stage_history (visa_id, from_stage, to_stage, changed_by, note)
      VALUES ($1, $2::visa_stage, $3::visa_stage, $4, $5)
    `, [req.params.id, oldStage, stage, staffId, note || null]);

    logger.info(`Visa ${req.params.id} stage: ${oldStage} → ${stage} by ${req.user.email}`);

    // TODO: trigger customer notification via notifications service
    res.json({ success: true, from: oldStage, to: stage });
  } catch (err) { next(err); }
}

async function uploadDocument(req, res, next) {
  try {
    // TODO: wire up SharePoint upload via graph service
    res.status(501).json({ error: 'SharePoint upload not yet configured — add Graph API credentials to .env' });
  } catch (err) { next(err); }
}

async function getChecklist(req, res, next) {
  try {
    const r = await query(`
      SELECT * FROM visa_checklist_items
      WHERE visa_type_id = $1 ORDER BY sort_order, item_name
    `, [req.params.visaTypeId]);
    res.json({ checklist: r.rows });
  } catch (err) { next(err); }
}

async function listVisaTypes(req, res, next) {
  try {
    const r = await query(`
      SELECT vt.*, co.name AS country_name
      FROM visa_types vt JOIN countries co ON co.code = vt.country_code
      ORDER BY co.name, vt.name
    `);
    res.json({ visa_types: r.rows });
  } catch (err) { next(err); }
}

module.exports = { list, getById, create, update, updateStage, uploadDocument, getChecklist, listVisaTypes };
