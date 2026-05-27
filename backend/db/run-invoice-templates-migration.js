/**
 * run-invoice-templates-migration.js
 * Adds two-template invoice support (Contract A & Ad-hoc B) and
 * extends invoice_number to VARCHAR(60) for NTT/CLIENT/PS434-2026 format.
 *
 * Usage (from project root):
 *   node backend/db/run-invoice-templates-migration.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { Pool } = require('pg');
const fs       = require('fs');
const path     = require('path');

const pool = new Pool({
  host:     process.env.DB_HOST,
  port:     parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl:      process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function main() {
  const sql = fs.readFileSync(path.join(__dirname, 'migrations/add_invoice_templates.sql'), 'utf8');
  console.log('Running invoice templates migration…');
  try {
    await pool.query(sql);
    console.log('✅ Invoice template columns added (template_type, personnel_salary, consumables,');
    console.log('   overhead_amount, profit_rate, profit_amount, bill_to_name, bill_to_address)');
    console.log('✅ invoice_number extended to VARCHAR(60)');
    console.log('✅ Invoice sequence reset to 435');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
