/**
 * clear-all-invoices.js
 * ONE-TIME script to delete ALL invoices, line items, and payments
 * so staff can start fresh with real data.
 *
 * Usage (from project root):
 *   node backend/db/clear-all-invoices.js
 *
 * ⚠️  This is irreversible. Run only once.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { Pool } = require('pg');

const pool = new Pool(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
    : {
        host:     process.env.DB_HOST,
        port:     parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME,
        user:     process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        ssl:      process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      }
);

async function main() {
  console.log('⚠️  Deleting ALL invoices, line items, and payments…');
  try {
    // invoice_line_items and invoice_payments cascade automatically
    const res = await pool.query('DELETE FROM invoices');
    console.log(`✅ Deleted ${res.rowCount} invoice(s) and all related line items / payments.`);

    // Reset the invoice sequence back to 1 for clean auto-generated numbers
    await pool.query("SELECT setval('invoice_seq', 1, false)");
    console.log('✅ Invoice sequence reset to 1 (next auto-number will be FNI-YYYY-00001).');
  } catch (err) {
    console.error('❌ Failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
