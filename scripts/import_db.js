const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function importDatabase() {
  try {
    console.log('🔌 Connecting to MySQL server...');
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : 'seyam',
      multipleStatements: true
    });

    const dbName = process.env.DB_NAME || 'classsync';
    console.log(`📦 Recreating database "${dbName}" for clean import...`);
    await connection.query('SET FOREIGN_KEY_CHECKS = 0;');
    await connection.query(`DROP DATABASE IF EXISTS \`${dbName}\`;`);
    await connection.query(`CREATE DATABASE \`${dbName}\`;`);
    await connection.query(`USE \`${dbName}\`;`);

    const sqlFilePath = path.join(__dirname, '../classsync_db.sql');
    if (!fs.existsSync(sqlFilePath)) {
      throw new Error(`classsync_db.sql not found at ${sqlFilePath}`);
    }

    console.log(`📖 Reading classsync_db.sql...`);
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

    console.log(`🚀 Importing tables and data into database "${dbName}"...`);
    await connection.query(sqlContent);
    await connection.query('SET FOREIGN_KEY_CHECKS = 1;');

    console.log('✅ Database classsync_db.sql successfully imported into MySQL Workbench!');
    await connection.end();
  } catch (err) {
    console.error('❌ Import failed:', err.message);
    process.exit(1);
  }
}

importDatabase();
