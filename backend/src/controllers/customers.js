/**
 * FlyNow BMS — Customers Controller
 * Handles: list, getById, create, update, interactions
 */

const { query } = require('../config/database');
const logger    = require('../config/logger');

// ─── LIST customers (with search + pagination) ────────────────────────────
async function listCustomers(req, res, next) {
  try {
    const {
      search = '',
      type   = '',
      page   = 1,
      limit  = 25,
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    const wheres = ['c.is_active = true'];

    if (search) {
      params.push(search);
      wheres.push(`search_vector @@ plainto_tsquery('english', $${params.length})`);
    }
    if (type) {
      params.push(type);
      wheres.push(`c.customer_type = $${params.length}::customer_type`);
    }

    const whereClause = wheres.length ? 'WHERE ' + wheres.join(' AND ') : '';

    // Count total
    const countSql = `
      SELECT COUNT(*) FROM customers c
      LEFT JOIN LATERAL to_tsvector('english',
        c.first_name || ' ' || c.last_name || ' ' ||
        COALESCE(c.email,'') || ' ' || COALESCE(c.company_name,'') ||
        ' ' || COALESCE(c.phone,'')
      ) search_vector ON true
      ${whereClause}
    `;

    // Fetch page
    params.push(parseInt(limit), offset);
    const dataSql = `
      SELECT
        c.id, c.first_name, c.last_name, c.email, c.phone, c.whatsapp,
        c.customer_type, c.company_name, c.passport_number, c.passport_expiry,
        c.nationality, c.source, c.assigned_to,
        s.full_name AS assigned_to_name,
        c.created_at, c.updated_at,
        (SELECT COUNT(*) FROM bookings b WHERE b.customer_id = c.id)           AS booking_count,
        (SELECT COUNT(*) FROM visa_applications v WHERE v.customer_id = c.id)  AS visa_count
      FROM customers c
      LEFT JOIN staff s ON s.id = c.assigned_to
      LEFT JOIN LATERAL to_tsvector('english',
        c.first_name || ' ' || c.last_name || ' ' ||
        COALESCE(c.email,'') || ' ' || COALESCE(c.company_name,'') ||
        ' ' || COALESCE(c.phone,'')
      ) search_vector ON true
      ${whereClause}
      ORDER BY c.updated_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;

    const [countRes, dataRes] = await Promise.all([
      query(countSql, params.slice(0, params.length - 2)),
      query(dataSql, params),
    ]);

    res.json({
      customers: dataRes.rows,
      total:     parseInt(countRes.rows[0].count),
      page:      parseInt(page),
      limit:     parseInt(limit),
    });
  } catch (err) {
    next(err);
  }
}

// ─── GET single customer ──────────────────────────────────────────────────
async function getCustomer(req, res, next) {
  try {
    const { id } = req.params;

    const customerRes = await query(`
      SELECT
        c.*,
        s.full_name AS assigned_to_name,
        co.name     AS nationality_name
      FROM customers c
      LEFT JOIN staff s  ON s.id  = c.assigned_to
      LEFT JOIN countries co ON co.code = c.nationality
      WHERE c.id = $1 AND c.is_active = true
    `, [id]);

    if (!customerRes.rows.length) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Recent bookings
    const bookingsRes = await query(`
      SELECT id, reference, service_type, status, travel_date, destination, selling_price, currency, created_at
      FROM bookings
      WHERE customer_id = $1
      ORDER BY created_at DESC
      LIMIT 10
    `, [id]);

    // Recent visa applications
    const visasRes = await query(`
      SELECT v.id, v.reference, v.stage, v.created_at,
             vt.name AS visa_type_name,
             co.name AS country_name
      FROM visa_applications v
      JOIN visa_types vt ON vt.id = v.visa_type_id
      JOIN countries  co ON co.code = vt.country_code
      WHERE v.customer_id = $1
      ORDER BY v.created_at DESC
      LIMIT 10
    `, [id]);

    res.json({
      customer: customerRes.rows[0],
      bookings: bookingsRes.rows,
      visas:    visasRes.rows,
    });
  } catch (err) {
    next(err);
  }
}

// ─── CREATE customer ──────────────────────────────────────────────────────
async function createCustomer(req, res, next) {
  try {
    const {
      first_name, last_name, email, phone, whatsapp,
      customer_type = 'Individual', company_name, job_title,
      passport_number, passport_expiry, nationality, date_of_birth, gender,
      address, city, state, notes, source = 'Walk-in', assigned_to,
    } = req.body;

    if (!first_name || !last_name || !phone) {
      return res.status(400).json({ error: 'first_name, last_name, and phone are required' });
    }

    const result = await query(`
      INSERT INTO customers (
        first_name, last_name, email, phone, whatsapp,
        customer_type, company_name, job_title,
        passport_number, passport_expiry, nationality, date_of_birth, gender,
        address, city, state, notes, source, assigned_to, created_by
      ) VALUES (
        $1,$2,$3,$4,$5,
        $6::customer_type,$7,$8,
        $9,$10,$11,$12,$13,
        $14,$15,$16,$17,$18::customer_source,$19,$20
      )
      RETURNING *
    `, [
      first_name, last_name, email || null, phone, whatsapp || null,
      customer_type, company_name || null, job_title || null,
      passport_number || null, passport_expiry || null,
      nationality || null, date_of_birth || null, gender || null,
      address || null, city || null, state || null,
      notes || null, source, assigned_to || null, req.user.dbId || null,
    ]);

    logger.info(`Customer created: ${result.rows[0].id} by ${req.user.email}`);
    res.status(201).json({ customer: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'A customer with this email already exists' });
    }
    next(err);
  }
}

// ─── UPDATE customer ──────────────────────────────────────────────────────
async function updateCustomer(req, res, next) {
  try {
    const { id } = req.params;
    const {
      first_name, last_name, email, phone, whatsapp,
      customer_type, company_name, job_title,
      passport_number, passport_expiry, nationality, date_of_birth, gender,
      address, city, state, notes, source, assigned_to, is_active,
    } = req.body;

    const result = await query(`
      UPDATE customers SET
        first_name      = COALESCE($1,  first_name),
        last_name       = COALESCE($2,  last_name),
        email           = COALESCE($3,  email),
        phone           = COALESCE($4,  phone),
        whatsapp        = COALESCE($5,  whatsapp),
        customer_type   = COALESCE($6::customer_type,   customer_type),
        company_name    = COALESCE($7,  company_name),
        job_title       = COALESCE($8,  job_title),
        passport_number = COALESCE($9,  passport_number),
        passport_expiry = COALESCE($10, passport_expiry),
        nationality     = COALESCE($11, nationality),
        date_of_birth   = COALESCE($12, date_of_birth),
        gender          = COALESCE($13, gender),
        address         = COALESCE($14, address),
        city            = COALESCE($15, city),
        state           = COALESCE($16, state),
        notes           = COALESCE($17, notes),
        source          = COALESCE($18::customer_source, source),
        assigned_to     = COALESCE($19, assigned_to),
        is_active       = COALESCE($20, is_active),
        updated_at      = NOW()
      WHERE id = $21 AND is_active = true
      RETURNING *
    `, [
      first_name, last_name, email, phone, whatsapp,
      customer_type, company_name, job_title,
      passport_number, passport_expiry, nationality, date_of_birth, gender,
      address, city, state, notes, source, assigned_to, is_active,
      id,
    ]);

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    logger.info(`Customer updated: ${id} by ${req.user.email}`);
    res.json({ customer: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'A customer with this email already exists' });
    }
    next(err);
  }
}

// ─── LOG interaction ──────────────────────────────────────────────────────
async function logInteraction(req, res, next) {
  try {
    const { id } = req.params;
    const { channel, summary, outcome, follow_up_at } = req.body;

    if (!channel || !summary) {
      return res.status(400).json({ error: 'channel and summary are required' });
    }

    // Resolve staff DB id from entra OID
    const staffRes = await query('SELECT id FROM staff WHERE entra_oid = $1', [req.user.oid]);
    if (!staffRes.rows.length) {
      return res.status(403).json({ error: 'Staff record not found. Please contact admin.' });
    }

    const result = await query(`
      INSERT INTO customer_interactions (customer_id, staff_id, channel, summary, outcome, follow_up_at)
      VALUES ($1, $2, $3::interaction_channel, $4, $5, $6)
      RETURNING *
    `, [id, staffRes.rows[0].id, channel, summary, outcome || null, follow_up_at || null]);

    res.status(201).json({ interaction: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// ─── GET interactions ─────────────────────────────────────────────────────
async function getInteractions(req, res, next) {
  try {
    const { id } = req.params;
    const result = await query(`
      SELECT ci.*, s.full_name AS staff_name, s.email AS staff_email
      FROM customer_interactions ci
      JOIN staff s ON s.id = ci.staff_id
      WHERE ci.customer_id = $1
      ORDER BY ci.created_at DESC
    `, [id]);

    res.json({ interactions: result.rows });
  } catch (err) {
    next(err);
  }
}

module.exports = { listCustomers, getCustomer, createCustomer, updateCustomer, logInteraction, getInteractions };
