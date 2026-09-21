const db = require('../src/config/db');

async function migratePart3() {
  console.log('--- Running Part 3 Schema Migrations ---');
  try {
    console.log('1. Creating classroom_messages table...');
    await db.query(`
      CREATE TABLE IF NOT EXISTS classroom_messages (
        message_id INT PRIMARY KEY AUTO_INCREMENT,
        classroom_id INT NOT NULL,
        sender_id INT NOT NULL,
        message_text TEXT NOT NULL,
        sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (classroom_id) REFERENCES classrooms(classroom_id),
        FOREIGN KEY (sender_id) REFERENCES users(user_id)
      )
    `);
    console.log('✅ classroom_messages table created/verified!');

    console.log('2. Creating direct_messages table...');
    await db.query(`
      CREATE TABLE IF NOT EXISTS direct_messages (
        message_id INT PRIMARY KEY AUTO_INCREMENT,
        classroom_id INT NOT NULL,
        sender_id INT NOT NULL,
        recipient_id INT NOT NULL,
        message_text TEXT NOT NULL,
        sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_read BOOLEAN DEFAULT false,
        FOREIGN KEY (classroom_id) REFERENCES classrooms(classroom_id),
        FOREIGN KEY (sender_id) REFERENCES users(user_id),
        FOREIGN KEY (recipient_id) REFERENCES users(user_id)
      )
    `);
    console.log('✅ direct_messages table created/verified!');

    console.log('\n--- DESCRIBE classroom_messages ---');
    const [cmDesc] = await db.query('DESCRIBE classroom_messages');
    console.table(cmDesc);

    console.log('\n--- DESCRIBE direct_messages ---');
    const [dmDesc] = await db.query('DESCRIBE direct_messages');
    console.table(dmDesc);

    console.log('\n🎉 Migration Part 3 completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
}

migratePart3();
