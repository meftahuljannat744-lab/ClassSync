const db = require('../src/config/db');

async function runMigration() {
  console.log('=== RUNNING PART 1 MIGRATION ===\n');

  try {
    // 1. Add phone_number to users
    try {
      await db.query('ALTER TABLE `users` ADD COLUMN `phone_number` VARCHAR(20) NULL');
      console.log('✔ Added phone_number to users table');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') console.log('ℹ phone_number column already exists on users');
      else throw e;
    }

    // 2. Add columns to classrooms
    const classroomCols = [
      { name: 'visibility', sql: "ALTER TABLE `classrooms` ADD COLUMN `visibility` ENUM('public','private') NOT NULL DEFAULT 'private'" },
      { name: 'is_paid', sql: 'ALTER TABLE `classrooms` ADD COLUMN `is_paid` BOOLEAN DEFAULT false' },
      { name: 'price', sql: 'ALTER TABLE `classrooms` ADD COLUMN `price` DECIMAL(10,2) NULL' },
      { name: 'cover_photo_url', sql: 'ALTER TABLE `classrooms` ADD COLUMN `cover_photo_url` VARCHAR(500) NULL' }
    ];

    for (const col of classroomCols) {
      try {
        await db.query(col.sql);
        console.log(`✔ Added ${col.name} to classrooms table`);
      } catch (e) {
        if (e.code === 'ER_DUP_FIELDNAME') console.log(`ℹ ${col.name} column already exists on classrooms`);
        else throw e;
      }
    }

    // 3. Create enrollment_requests table
    await db.query(`
      CREATE TABLE IF NOT EXISTS \`enrollment_requests\` (
        request_id INT PRIMARY KEY AUTO_INCREMENT,
        classroom_id INT NOT NULL,
        user_id INT NOT NULL,
        payment_method VARCHAR(50),
        payer_phone_number VARCHAR(20),
        transaction_id VARCHAR(100),
        status ENUM('pending','approved','rejected') DEFAULT 'pending',
        requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        reviewed_by INT NULL,
        reviewed_at TIMESTAMP NULL,
        FOREIGN KEY (classroom_id) REFERENCES classrooms(classroom_id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
        FOREIGN KEY (reviewed_by) REFERENCES users(user_id) ON DELETE SET NULL
      )
    `);
    console.log('✔ Verified enrollment_requests table');

    // 4. Print DESCRIBE output for verification
    console.log('\n--- DESCRIBE users ---');
    const [userDesc] = await db.query('DESCRIBE users');
    console.table(userDesc.map(row => ({ Field: row.Field, Type: row.Type, Null: row.Null, Key: row.Key, Default: row.Default })));

    console.log('\n--- DESCRIBE classrooms ---');
    const [roomDesc] = await db.query('DESCRIBE classrooms');
    console.table(roomDesc.map(row => ({ Field: row.Field, Type: row.Type, Null: row.Null, Key: row.Key, Default: row.Default })));

    console.log('\n--- DESCRIBE enrollment_requests ---');
    const [reqDesc] = await db.query('DESCRIBE enrollment_requests');
    console.table(reqDesc.map(row => ({ Field: row.Field, Type: row.Type, Null: row.Null, Key: row.Key, Default: row.Default })));

    console.log('\n🎉 PART 1 MIGRATION COMPLETED SUCCESSFULLY!');
    process.exit(0);
  } catch (err) {
    console.error('❌ MIGRATION FAILED:', err);
    process.exit(1);
  }
}

runMigration();
