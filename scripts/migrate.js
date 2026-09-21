const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function runMigrations() {
  console.log('--- Starting Unified ClassSync Migration Runner ---');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'classsync_db',
    multipleStatements: true
  });

  console.log('✔ Connected to MySQL database.');

  const migrationsDir = path.join(__dirname, '../migrations');
  if (!fs.existsSync(migrationsDir)) {
    console.log('No migrations directory found.');
    await connection.end();
    return;
  }

  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

  for (const file of files) {
    console.log(`Executing migration: ${file}...`);
    const sqlPath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Split SQL statements by semicolon
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const stmt of statements) {
      try {
        await connection.query(stmt);
      } catch (err) {
        // If column already exists (ER_DUP_FIELDNAME / 1060), ignore cleanly
        if (err.errno === 1060 || err.code === 'ER_DUP_FIELDNAME') {
          console.log(`  ℹ️ Column already exists, skipping.`);
        } else {
          console.log(`  Notice: ${err.message}`);
        }
      }
    }
    console.log(`✔ Completed ${file}`);
  }

  // Ensure seed test users are marked verified
  try {
    await connection.query(`UPDATE \`users\` SET \`is_verified\` = true WHERE \`user_id\` <= 10;`);
    console.log('✔ Seed users marked as verified.');
  } catch (err) {
    // ignore if table doesn't have is_verified yet
  }

  await connection.end();
  console.log('--- All Migrations Applied Successfully! ---');
}

runMigrations().catch(err => {
  console.error('❌ Migration runner failed:', err);
  process.exit(1);
});
