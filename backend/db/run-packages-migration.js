/**
 * run-packages-migration.js
 * Applies the packages table migration to the live database.
 *
 * Usage:
 *   node backend/db/run-packages-migration.js
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
  const sql = fs.readFileSync(path.join(__dirname, 'migrations/add_packages.sql'), 'utf8');
  console.log('Running packages migration…');
  try {
    await pool.query(sql);
    console.log('✅ packages table created (or already exists)');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
