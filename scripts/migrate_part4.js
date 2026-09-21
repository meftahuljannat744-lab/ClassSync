const db = require('../src/config/db');

async function migrate() {
  try {
    const [cols] = await db.query("SHOW COLUMNS FROM classrooms LIKE 'attendance_threshold_percent'");
    if (cols.length === 0) {
      await db.query("ALTER TABLE classrooms ADD COLUMN attendance_threshold_percent INT DEFAULT 75");
      console.log('Successfully added attendance_threshold_percent to classrooms table.');
    } else {
      console.log('attendance_threshold_percent column already exists in classrooms table.');
    }

    const [desc] = await db.query('DESCRIBE classrooms');
    console.log('Classrooms table structure:');
    console.table(desc);
    process.exit(0);
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  }
}

migrate();
