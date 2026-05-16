const { Pool } = require('pg');
const logger   = require('./logger');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 10,              // max pool connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  logger.error('Unexpected PostgreSQL pool error:', err);
});

/**
 * Run a parameterised query.
 * @param {string} text   - SQL query with $1, $2 ... placeholders
 * @param {Array}  params - Query parameters
 */
async function query(text, params) {
  const start = Date.now();
  const res   = await pool.query(text, params);
  logger.debug(`Query executed in ${Date.now() - start}ms — rows: ${res.rowCount}`);
  return res;
}

/** Get a client for multi-statement transactions. */
async function getClient() {
  return pool.connect();
}

/** Verify the database is reachable on startup. */
async function connectDB() {
  const client = await pool.connect();
  await client.query('SELECT 1');
  client.release();
}

module.exports = { query, getClient, connectDB, pool };
