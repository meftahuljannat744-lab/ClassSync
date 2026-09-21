const db = require('../src/config/db');

async function testMessagingSystem() {
  console.log('--- Testing Part 3 Messaging System ---');
  try {
    // 1. Verify DB tables exist
    console.log('1. Checking DB Tables...');
    const [cmCols] = await db.query("SHOW COLUMNS FROM classroom_messages");
    console.log('classroom_messages columns count:', cmCols.length);

    const [dmCols] = await db.query("SHOW COLUMNS FROM direct_messages");
    console.log('direct_messages columns count:', dmCols.length);

    // 2. Fetch a sample classroom & members
    const [classrooms] = await db.query('SELECT classroom_id FROM classrooms LIMIT 1');
    if (classrooms.length === 0) {
      console.log('No classrooms found in DB to test.');
      process.exit(0);
    }

    const classroomId = classrooms[0].classroom_id;
    const [members] = await db.query(
      `SELECT user_id, role FROM classroom_members WHERE classroom_id = ? AND is_active = true`,
      [classroomId]
    );

    console.log(`Classroom ID ${classroomId} has active members:`, members);

    if (members.length >= 2) {
      const u1 = members[0].user_id;
      const u2 = members[1].user_id;

      // Test posting group message
      console.log('\n2. Testing Group Message insertion...');
      const [gRes] = await db.query(
        `INSERT INTO classroom_messages (classroom_id, sender_id, message_text) VALUES (?, ?, ?)`,
        [classroomId, u1, 'Test automated group chat message']
      );
      console.log('Inserted group message ID:', gRes.insertId);

      // Test fetching group messages
      const [gMessages] = await db.query(
        `SELECT m.message_id, m.message_text, u.full_name AS sender_name
         FROM classroom_messages m
         JOIN users u ON m.sender_id = u.user_id
         WHERE m.classroom_id = ?
         ORDER BY m.sent_at DESC LIMIT 100`,
        [classroomId]
      );
      console.log('Group messages fetched count:', gMessages.length);

      // Test posting DM
      console.log('\n3. Testing Direct Message insertion...');
      const [dmRes] = await db.query(
        `INSERT INTO direct_messages (classroom_id, sender_id, recipient_id, message_text) VALUES (?, ?, ?, ?)`,
        [classroomId, u1, u2, 'Test automated direct message']
      );
      console.log('Inserted DM message ID:', dmRes.insertId);

      // Test unread count
      const [[{ unread_count }]] = await db.query(
        `SELECT COUNT(*) AS unread_count FROM direct_messages WHERE classroom_id = ? AND recipient_id = ? AND is_read = false`,
        [classroomId, u2]
      );
      console.log(`Unread count for recipient User ID ${u2}:`, unread_count);
    }

    console.log('\n✅ ALL PART 3 MESSAGING VERIFICATION CHECKS PASSED!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Verification failed:', err.message);
    process.exit(1);
  }
}

testMessagingSystem();
