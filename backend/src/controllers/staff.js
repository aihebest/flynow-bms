/**
 * FlyNow BMS — Staff Controller
 */
const { query } = require('../config/database');

async function getMe(req, res, next) {
  try {
    const r = await query(`
      SELECT s.*,
             (SELECT COUNT(*) FROM leave_requests l WHERE l.staff_id = s.id AND l.status = 'Approved'
              AND EXTRACT(YEAR FROM l.start_date) = EXTRACT(YEAR FROM NOW())) AS leave_taken_this_year
      FROM staff s WHERE s.entra_oid = $1
    `, [req.user.oid]);

    if (!r.rows.length) {
      // Staff record doesn't exist yet — return info from token
      return res.json({
        staff: null,
        token_user: { oid: req.user.oid, email: req.user.email, name: req.user.name, roles: req.user.roles },
      });
    }

    res.json({ staff: r.rows[0] });
  } catch (err) { next(err); }
}

async function list(req, res, next) {
  try {
    const r = await query(`
      SELECT id, email, full_name, role, branch, department, phone, is_active, created_at
      FROM staff ORDER BY full_name
    `);
    res.json({ staff: r.rows });
  } catch (err) { next(err); }
}

async function getById(req, res, next) {
  try {
    const r = await query('SELECT * FROM staff WHERE id = $1', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Staff not found' });
    res.json({ staff: r.rows[0] });
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const { entra_oid, email, full_name, role, branch, phone, department, date_joined } = req.body;
    if (!entra_oid || !email || !full_name || !role) {
      return res.status(400).json({ error: 'entra_oid, email, full_name, and role are required' });
    }
    const r = await query(`
      INSERT INTO staff (entra_oid, email, full_name, role, branch, phone, department, date_joined)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *
    `, [entra_oid, email, full_name, role, branch || 'Head Office', phone || null, department || null, date_joined || null]);

    res.status(201).json({ staff: r.rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Staff with this email or Entra ID already exists' });
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const { full_name, role, branch, phone, department, is_active } = req.body;
    const r = await query(`
      UPDATE staff SET
        full_name  = COALESCE($1, full_name),
        role       = COALESCE($2, role),
        branch     = COALESCE($3, branch),
        phone      = COALESCE($4, phone),
        department = COALESCE($5, department),
        is_active  = COALESCE($6, is_active),
        updated_at = NOW()
      WHERE id = $7 RETURNING *
    `, [full_name, role, branch, phone, department, is_active, req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Staff not found' });
    res.json({ staff: r.rows[0] });
  } catch (err) { next(err); }
}

// ─── Leave ────────────────────────────────────────────────────────────────

async function applyLeave(req, res, next) {
  try {
    const { leave_type, start_date, end_date, days_count, reason } = req.body;
    if (!leave_type || !start_date || !end_date || !days_count) {
      return res.status(400).json({ error: 'leave_type, start_date, end_date, days_count are required' });
    }

    const staffRes = await query('SELECT id FROM staff WHERE entra_oid = $1', [req.user.oid]);
    if (!staffRes.rows.length) return res.status(403).json({ error: 'Your staff record is not set up yet' });

    const r = await query(`
      INSERT INTO leave_requests (staff_id, leave_type, start_date, end_date, days_count, reason)
      VALUES ($1,$2,$3,$4,$5,$6) RETURNING *
    `, [staffRes.rows[0].id, leave_type, start_date, end_date, days_count, reason || null]);

    // TODO: trigger Power Automate / Teams approval flow
    res.status(201).json({ leave_request: r.rows[0] });
  } catch (err) { next(err); }
}

async function getMyLeave(req, res, next) {
  try {
    const staffRes = await query('SELECT id FROM staff WHERE entra_oid = $1', [req.user.oid]);
    if (!staffRes.rows.length) return res.json({ leave_requests: [] });

    const r = await query(`
      SELECT l.*, s2.full_name AS approved_by_name
      FROM leave_requests l LEFT JOIN staff s2 ON s2.id = l.approved_by
      WHERE l.staff_id = $1 ORDER BY l.created_at DESC
    `, [staffRes.rows[0].id]);

    res.json({ leave_requests: r.rows });
  } catch (err) { next(err); }
}

async function getTeamLeave(req, res, next) {
  try {
    const r = await query(`
      SELECT l.*, s.full_name AS staff_name, s.department, s2.full_name AS approved_by_name
      FROM leave_requests l
      JOIN staff s ON s.id = l.staff_id
      LEFT JOIN staff s2 ON s2.id = l.approved_by
      ORDER BY l.created_at DESC LIMIT 100
    `);
    res.json({ leave_requests: r.rows });
  } catch (err) { next(err); }
}

async function approveLeave(req, res, next) {
  try {
    const staffRes = await query('SELECT id FROM staff WHERE entra_oid = $1', [req.user.oid]);
    const approverId = staffRes.rows[0]?.id || null;

    const r = await query(`
      UPDATE leave_requests
      SET status = 'Approved', approved_by = $1, approved_at = NOW(), approver_note = $2
      WHERE id = $3 AND status = 'Pending' RETURNING *
    `, [approverId, req.body.note || null, req.params.id]);

    if (!r.rows.length) return res.status(404).json({ error: 'Leave request not found or already actioned' });
    // TODO: update Outlook calendar + notify staff via Teams
    res.json({ leave_request: r.rows[0] });
  } catch (err) { next(err); }
}

async function rejectLeave(req, res, next) {
  try {
    const staffRes = await query('SELECT id FROM staff WHERE entra_oid = $1', [req.user.oid]);
    const approverId = staffRes.rows[0]?.id || null;

    const r = await query(`
      UPDATE leave_requests
      SET status = 'Rejected', approved_by = $1, approved_at = NOW(), approver_note = $2
      WHERE id = $3 AND status = 'Pending' RETURNING *
    `, [approverId, req.body.note || null, req.params.id]);

    if (!r.rows.length) return res.status(404).json({ error: 'Leave request not found or already actioned' });
    res.json({ leave_request: r.rows[0] });
  } catch (err) { next(err); }
}

module.exports = { getMe, list, getById, create, update, applyLeave, getMyLeave, getTeamLeave, approveLeave, rejectLeave };
