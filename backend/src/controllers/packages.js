/**
 * FlyNow BMS — Holiday Packages Controller
 */
const { query } = require('../config/database');

async function list(req, res, next) {
  try {
    const { status, search } = req.query;
    const params = [];
    const wheres = [];

    if (status) { params.push(status); wheres.push(`p.status = $${params.length}`); }
    if (search) {
      params.push(`%${search}%`);
      wheres.push(`(p.name ILIKE $${params.length} OR p.destination ILIKE $${params.length})`);
    }

    const where = wheres.length ? 'WHERE ' + wheres.join(' AND ') : '';

    const r = await query(`
      SELECT p.*, s.full_name AS created_by_name
      FROM packages p
      LEFT JOIN staff s ON s.id = p.created_by
      ${where}
      ORDER BY p.sort_order ASC, p.created_at DESC
    `, params);

    res.json({ packages: r.rows });
  } catch (err) { next(err); }
}

async function getById(req, res, next) {
  try {
    const r = await query(`
      SELECT p.*, s.full_name AS created_by_name
      FROM packages p LEFT JOIN staff s ON s.id = p.created_by
      WHERE p.id = $1
    `, [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Package not found' });
    res.json({ package: r.rows[0] });
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const {
      name, destination, origin, duration_days, price, currency = 'NGN',
      inclusions = [], highlights = [], description, status = 'Active',
      max_pax, sort_order = 0,
    } = req.body;

    if (!name || !destination || !duration_days || price === undefined) {
      return res.status(400).json({ error: 'name, destination, duration_days and price are required' });
    }

    // Resolve created_by from staff table
    const staffRes = await query('SELECT id FROM staff WHERE entra_oid = $1', [req.user.oid]);
    const createdBy = staffRes.rows[0]?.id || null;

    const r = await query(`
      INSERT INTO packages (
        name, destination, origin, duration_days, price, currency,
        inclusions, highlights, description, status, max_pax, sort_order, created_by
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      RETURNING *
    `, [
      name, destination, origin || null, parseInt(duration_days), parseFloat(price), currency,
      inclusions, highlights, description || null, status,
      max_pax ? parseInt(max_pax) : null, parseInt(sort_order), createdBy,
    ]);

    res.status(201).json({ package: r.rows[0] });
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const {
      name, destination, origin, duration_days, price, currency,
      inclusions, highlights, description, status, max_pax, sort_order,
    } = req.body;

    const r = await query(`
      UPDATE packages SET
        name          = COALESCE($1,  name),
        destination   = COALESCE($2,  destination),
        origin        = COALESCE($3,  origin),
        duration_days = COALESCE($4,  duration_days),
        price         = COALESCE($5,  price),
        currency      = COALESCE($6,  currency),
        inclusions    = COALESCE($7,  inclusions),
        highlights    = COALESCE($8,  highlights),
        description   = COALESCE($9,  description),
        status        = COALESCE($10, status),
        max_pax       = COALESCE($11, max_pax),
        sort_order    = COALESCE($12, sort_order),
        updated_at    = NOW()
      WHERE id = $13
      RETURNING *
    `, [
      name, destination, origin,
      duration_days ? parseInt(duration_days) : null,
      price !== undefined ? parseFloat(price) : null,
      currency, inclusions, highlights, description, status,
      max_pax ? parseInt(max_pax) : null,
      sort_order !== undefined ? parseInt(sort_order) : null,
      req.params.id,
    ]);

    if (!r.rows.length) return res.status(404).json({ error: 'Package not found' });
    res.json({ package: r.rows[0] });
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    const r = await query('DELETE FROM packages WHERE id = $1 RETURNING id', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Package not found' });
    res.json({ success: true });
  } catch (err) { next(err); }
}

module.exports = { list, getById, create, update, remove };
