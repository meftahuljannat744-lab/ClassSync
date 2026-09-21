const db = require('../src/config/db');

async function migrate() {
  console.log('--- Migrating database for resource & question attachment types (text, link, pdf, pptx, docx) ---');

  try {
    // 1. Add resource_type column to resources table
    try {
      await db.query(`ALTER TABLE resources ADD COLUMN resource_type VARCHAR(50) NOT NULL DEFAULT 'link'`);
      console.log('✅ Added resource_type column to resources table.');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log('ℹ️ Column resource_type already exists on resources table.');
      } else {
        throw e;
      }
    }

    // 2. Modify question_type column on questions table
    await db.query(`ALTER TABLE questions MODIFY COLUMN question_type VARCHAR(50) NOT NULL DEFAULT 'text'`);
    console.log('✅ Modified question_type column on questions table to VARCHAR(50).');

    console.log('🎉 Migration finished successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration error:', err);
    process.exit(1);
  }
}

migrate();
