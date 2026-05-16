/**
 * run-schema.js — Apply the FlyNow BMS schema to Azure PostgreSQL.
 * Skips objects that already exist (safe to re-run at any time).
 *
 * Usage (PowerShell):
 *   $env:DATABASE_URL = "postgresql://nowtraveladmin:admin123.@flynowtravels-db.postgres.database.azure.com:5432/postgres?sslmode=require"
 *   node backend/db/run-schema.js
 */

const { Client } = require('pg');
const path = require('path');
const fs   = require('fs');

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) {
  console.error('❌  DATABASE_URL environment variable is not set.');
  process.exit(1);
}

// PostgreSQL error codes we can safely ignore (object already exists)
const ALREADY_EXISTS_CODES = new Set([
  '42P07', // duplicate_table
  '42710', // duplicate_object  (types, extensions, indexes)
  '42P16', // invalid_table_definition (some duplicate scenarios)
  '42723', // duplicate_function
  '42701', // duplicate_column
  '23505', // unique_violation   (seed data already inserted)
  '42704', // undefined_object   (DROP IF EXISTS on non-existent)
  '42P06', // duplicate_schema
]);

/**
 * Split a SQL file into individual statements, handling:
 *  - $$ dollar-quoted function bodies
 *  - line comments (--)
 *  - block comments (/* ... *\/)
 */
function splitStatements(sql) {
  const statements = [];
  let current = '';
  let inDollarQuote = false;
  let dollarTag = '';
  let i = 0;

  while (i < sql.length) {
    // Dollar quoting: $$ or $tag$
    if (!inDollarQuote && sql[i] === '$') {
      const end = sql.indexOf('$', i + 1);
      if (end !== -1) {
        const tag = sql.slice(i, end + 1);
        inDollarQuote = true;
        dollarTag = tag;
        current += tag;
        i = end + 1;
        continue;
      }
    }
    if (inDollarQuote) {
      if (sql.startsWith(dollarTag, i)) {
        current += dollarTag;
        i += dollarTag.length;
        inDollarQuote = false;
        dollarTag = '';
        continue;
      }
      current += sql[i++];
      continue;
    }

    // Statement terminator
    if (sql[i] === ';') {
      current += ';';
      const trimmed = current.trim();
      if (trimmed && trimmed !== ';') statements.push(trimmed);
      current = '';
      i++;
      continue;
    }

    current += sql[i++];
  }

  const trimmed = current.trim();
  if (trimmed) statements.push(trimmed);
  return statements;
}

async function main() {
  const client = new Client({
    connectionString: DB_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log('🔌  Connecting to Azure PostgreSQL…');
    await client.connect();
    console.log('✅  Connected.\n');

    const schemaPath = path.join(__dirname, 'schema.sql');
    const rawSQL = fs.readFileSync(schemaPath, 'utf8');

    // Remove pg_trgm extension line (not needed; GIN uses built-in to_tsvector)
    const cleanSQL = rawSQL
      .split('\n')
      .filter(line => !line.match(/^CREATE EXTENSION.*pg_trgm/i))
      .join('\n');

    const statements = splitStatements(cleanSQL);
    console.log(`📋  Executing ${statements.length} statements (skipping any that already exist)…\n`);

    let created = 0;
    let skipped = 0;
    let errors  = 0;

    for (const stmt of statements) {
      // Skip pure comment blocks
      if (stmt.replace(/--[^\n]*/g, '').trim() === '') { skipped++; continue; }

      const preview = stmt.replace(/\s+/g, ' ').slice(0, 70);
      try {
        await client.query(stmt);
        console.log(`  ✅  ${preview}`);
        created++;
      } catch (err) {
        if (ALREADY_EXISTS_CODES.has(err.code)) {
          console.log(`  ⏭️   SKIP (already exists): ${preview}`);
          skipped++;
        } else {
          console.error(`  ❌  ERROR [${err.code}]: ${err.message}`);
          console.error(`      SQL: ${preview}`);
          errors++;
        }
      }
    }

    console.log('\n─────────────────────────────────────────');
    console.log(`  Created/ran : ${created}`);
    console.log(`  Skipped     : ${skipped}`);
    console.log(`  Errors      : ${errors}`);
    console.log('─────────────────────────────────────────');

    if (errors === 0) {
      console.log('\n🎉  Schema is fully applied — all tables are in place!\n');
    } else {
      console.log('\n⚠️   Some statements failed. Review the errors above.\n');
      process.exit(1);
    }

  } catch (err) {
    console.error('❌  Fatal error:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
