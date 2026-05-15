/**
 * FlyNow BMS — Bookings Controller
 * TODO: Implement full booking logic (Phase 2 of build)
 */
const { query } = require('../config/database');

async function list(req, res, next) {
  try {
    const { status = '', search = '', page = 1, limit = 25 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    const wheres = [];

    if (status) { params.push(status); wheres.push(`b.status = $${params.length}::booking_status`); }
    if (search) {
      params.push(`%${search}%`);
      wheres.push(`(
        c.first_name ILIKE $${params.length} OR
        c.last_name  ILIKE $${params.length} OR
        b.reference  ILIKE $${params.length} OR
        b.destination ILIKE $${params.length} OR
        b.pnr        ILIKE $${params.length}
      )`);
    }

    const where = wheres.length ? 'WHERE ' + wheres.join(' AND ') : '';
    params.push(parseInt(limit), offset);

    const data = await query(`
      SELECT b.*, c.first_name, c.last_name, c.phone,
             s.full_name AS assigned_to_name
      FROM bookings b
      JOIN customers c ON c.id = b.customer_id
      LEFT JOIN staff s ON s.id = b.assigned_to
      ${where}
      ORDER BY b.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params);

    res.json({ bookings: data.rows, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) { next(err); }
}

async function getById(req, res, next) {
  try {
    const r = await query(`
      SELECT b.*, c.first_name, c.last_name, c.email, c.phone
      FROM bookings b JOIN customers c ON c.id = b.customer_id
      WHERE b.id = $1
    `, [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Booking not found' });
    res.json({ booking: r.rows[0] });
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const {
      customer_id, service_type, status = 'Enquiry',
      origin, destination, travel_date, return_date,
      pax_count = 1, pax_names, pnr, airline, flight_numbers,
      hotel_name, hotel_confirmation, cost_price, selling_price,
      currency = 'NGN', internal_notes, customer_notes, assigned_to,
    } = req.body;

    if (!customer_id || !service_type) {
      return res.status(400).json({ error: 'customer_id and service_type are required' });
    }

    const r = await query(`
      INSERT INTO bookings (
        customer_id, service_type, status,
        origin, destination, travel_date, return_date,
        pax_count, pax_names, pnr, airline, flight_numbers,
        hotel_name, hotel_confirmation, cost_price, selling_price,
        currency, internal_notes, customer_notes, assigned_to, created_by
      ) VALUES (
        $1,$2,$3::booking_status,
        $4,$5,$6,$7,
        $8,$9,$10,$11,$12,
        $13,$14,$15,$16,
        $17,$18,$19,$20,$21
      ) RETURNING *
    `, [
      customer_id, service_type, status,
      origin || null, destination || null, travel_date || null, return_date || null,
      pax_count, pax_names ? JSON.stringify(pax_names) : null,
      pnr || null, airline || null, flight_numbers || null,
      hotel_name || null, hotel_confirmation || null,
      cost_price || null, selling_price || null,
      currency, internal_notes || null, customer_notes || null,
      assigned_to || null, null,
    ]);

    res.status(201).json({ booking: r.rows[0] });
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const fields = req.body;
    const r = await query(`
      UPDATE bookings SET
        service_type    = COALESCE($1::booking_service, service_type),
        origin          = COALESCE($2,  origin),
        destination     = COALESCE($3,  destination),
        travel_date     = COALESCE($4,  travel_date),
        return_date     = COALESCE($5,  return_date),
        pax_count       = COALESCE($6,  pax_count),
        pnr             = COALESCE($7,  pnr),
        airline         = COALESCE($8,  airline),
        flight_numbers  = COALESCE($9,  flight_numbers),
        hotel_name      = COALESCE($10, hotel_name),
        cost_price      = COALESCE($11, cost_price),
        selling_price   = COALESCE($12, selling_price),
        internal_notes  = COALESCE($13, internal_notes),
        assigned_to     = COALESCE($14, assigned_to),
        updated_at      = NOW()
      WHERE id = $15
      RETURNING *
    `, [
      fields.service_type, fields.origin, fields.destination,
      fields.travel_date, fields.return_date, fields.pax_count,
      fields.pnr, fields.airline, fields.flight_numbers, fields.hotel_name,
      fields.cost_price, fields.selling_price, fields.internal_notes,
      fields.assigned_to, req.params.id,
    ]);
    if (!r.rows.length) return res.status(404).json({ error: 'Booking not found' });
    res.json({ booking: r.rows[0] });
  } catch (err) { next(err); }
}

async function updateStatus(req, res, next) {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'status is required' });

    const tsField = {
      Confirmed: 'confirmed_at', Ticketed: 'ticketed_at', Completed: 'completed_at',
    }[status];

    const r = await query(`
      UPDATE bookings
      SET status = $1::booking_status,
          ${tsField ? `${tsField} = NOW(),` : ''}
          updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [status, req.params.id]);

    if (!r.rows.length) return res.status(404).json({ error: 'Booking not found' });
    res.json({ booking: r.rows[0] });
  } catch (err) { next(err); }
}

module.exports = { list, getById, create, update, updateStatus };
