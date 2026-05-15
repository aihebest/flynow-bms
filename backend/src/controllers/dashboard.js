/**
 * FlyNow BMS — Dashboard Controller
 */
const { query } = require('../config/database');

async function summary(req, res, next) {
  try {
    const [bookings, visas, invoices, customers] = await Promise.all([
      query(`SELECT COUNT(*) AS total,
               COUNT(*) FILTER (WHERE status = 'Confirmed') AS confirmed,
               COUNT(*) FILTER (WHERE status = 'Enquiry')   AS enquiries,
               COUNT(*) FILTER (WHERE DATE(created_at) = CURRENT_DATE) AS today
             FROM bookings`),
      query(`SELECT COUNT(*) AS total,
               COUNT(*) FILTER (WHERE stage NOT IN ('Approved','Rejected','Delivered','Cancelled')) AS active,
               COUNT(*) FILTER (WHERE stage = 'Submitted to Embassy') AS at_embassy,
               COUNT(*) FILTER (WHERE stage = 'Approved' AND DATE_TRUNC('month', updated_at) = DATE_TRUNC('month', NOW())) AS approved_this_month
             FROM visa_applications`),
      query(`SELECT COUNT(*) AS total,
               COALESCE(SUM(balance_due) FILTER (WHERE status NOT IN ('Paid','Cancelled','Refunded')), 0) AS outstanding,
               COALESCE(SUM(amount_paid) FILTER (WHERE DATE_TRUNC('month', paid_at) = DATE_TRUNC('month', NOW())), 0) AS collected_this_month
             FROM invoices`),
      query(`SELECT COUNT(*) AS total,
               COUNT(*) FILTER (WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW())) AS new_this_month
             FROM customers WHERE is_active = true`),
    ]);

    res.json({
      bookings:  bookings.rows[0],
      visas:     visas.rows[0],
      invoices:  invoices.rows[0],
      customers: customers.rows[0],
    });
  } catch (err) { next(err); }
}

async function bookingsChart(req, res, next) {
  try {
    const r = await query(`
      SELECT DATE_TRUNC('day', created_at)::DATE AS date, COUNT(*) AS count,
             COALESCE(SUM(selling_price), 0) AS revenue
      FROM bookings
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY 1 ORDER BY 1
    `);
    res.json({ chart: r.rows });
  } catch (err) { next(err); }
}

async function visaPipeline(req, res, next) {
  try {
    const r = await query(`
      SELECT stage, COUNT(*) AS count
      FROM visa_applications
      WHERE stage NOT IN ('Cancelled', 'Delivered')
      GROUP BY stage ORDER BY stage
    `);
    res.json({ pipeline: r.rows });
  } catch (err) { next(err); }
}

async function revenue(req, res, next) {
  try {
    const r = await query(`
      SELECT DATE_TRUNC('month', paid_at)::DATE AS month,
             COALESCE(SUM(amount), 0) AS total
      FROM payments
      WHERE paid_at >= NOW() - INTERVAL '6 months'
      GROUP BY 1 ORDER BY 1
    `);
    res.json({ revenue: r.rows });
  } catch (err) { next(err); }
}

async function expiryAlerts(req, res, next) {
  try {
    const r = await query(`
      SELECT id, first_name, last_name, phone, email, passport_number, passport_expiry,
             (passport_expiry - CURRENT_DATE) AS days_until_expiry
      FROM customers
      WHERE is_active = true
        AND passport_expiry IS NOT NULL
        AND passport_expiry <= CURRENT_DATE + INTERVAL '180 days'
      ORDER BY passport_expiry ASC
      LIMIT 50
    `);
    res.json({ alerts: r.rows });
  } catch (err) { next(err); }
}

module.exports = { summary, bookingsChart, visaPipeline, revenue, expiryAlerts };
