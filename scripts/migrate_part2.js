const db = require('../src/config/db');

async function migratePart2() {
  console.log('--- Running Part 2 Schema Migrations ---');
  try {
    console.log('1. Modifying questions.question_type enum...');
    await db.query(`
      ALTER TABLE questions MODIFY COLUMN question_type ENUM('link','text','pdf','docx','pptx') NOT NULL DEFAULT 'text';
    `);
    console.log('✅ questions.question_type updated!');

    console.log('2. Adding submissions.submission_type enum column if not exists...');
    const [cols] = await db.query(`SHOW COLUMNS FROM submissions LIKE 'submission_type'`);
    if (cols.length === 0) {
      await db.query(`
        ALTER TABLE submissions ADD COLUMN submission_type ENUM('text','link','pdf','docx','pptx') NOT NULL DEFAULT 'text';
      `);
      console.log('✅ submissions.submission_type column added!');
    } else {
      await db.query(`
        ALTER TABLE submissions MODIFY COLUMN submission_type ENUM('text','link','pdf','docx','pptx') NOT NULL DEFAULT 'text';
      `);
      console.log('✅ submissions.submission_type column updated!');
    }

    console.log('\n--- DESCRIBE questions ---');
    const [qDesc] = await db.query('DESCRIBE questions');
    console.table(qDesc);

    console.log('\n--- DESCRIBE submissions ---');
    const [sDesc] = await db.query('DESCRIBE submissions');
    console.table(sDesc);

    console.log('\n🎉 Migration Part 2 completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
}

migratePart2();
