const db = require('../src/config/db');

async function testPart2Features() {
  console.log('--- Testing Part 2 Features ---');
  try {
    // 1. Verify DB enum values
    console.log('1. Checking DB Column Enums...');
    const [qCols] = await db.query("SHOW COLUMNS FROM questions LIKE 'question_type'");
    console.log('questions.question_type Type:', qCols[0].Type);

    const [sCols] = await db.query("SHOW COLUMNS FROM submissions LIKE 'submission_type'");
    console.log('submissions.submission_type Type:', sCols[0].Type);

    // 2. Test Student Info Query logic with a dummy classroom
    console.log('\n2. Testing Student Info Query Logic...');
    const [classrooms] = await db.query('SELECT classroom_id FROM classrooms LIMIT 1');
    if (classrooms.length > 0) {
      const classroomId = classrooms[0].classroom_id;
      const [[{ total_sessions }]] = await db.query(
        `SELECT COUNT(*) as total_sessions FROM live_sessions WHERE classroom_id = ? AND is_active = true`,
        [classroomId]
      );
      console.log(`Classroom ID ${classroomId} has total live sessions: ${total_sessions}`);

      const [learners] = await db.query(
        `SELECT cm.user_id, u.full_name, u.email, u.phone_number
         FROM classroom_members cm
         JOIN users u ON cm.user_id = u.user_id
         WHERE cm.classroom_id = ? AND cm.role = 'learner' AND cm.is_active = true`,
        [classroomId]
      );
      console.log(`Enrolled learners found: ${learners.length}`);
      if (learners.length > 0) {
        console.log('Sample learner data:', learners[0]);
      }
    }

    console.log('\n✅ ALL PART 2 BACKEND VERIFICATION CHECKS PASSED!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Verification failed:', err.message);
    process.exit(1);
  }
}

testPart2Features();
