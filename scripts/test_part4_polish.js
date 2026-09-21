const db = require('../src/config/db');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'classsync_secret_jwt_key_2026';
const BASE_URL = 'http://localhost:3000/api';

async function request(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || `HTTP ${res.status}`);
  }
  return data;
}

async function runTests() {
  console.log('=== PART 4 AUTOMATED VERIFICATION SCRIPT ===\n');
  let tokenInstructor, tokenLearner, classroomId;

  try {
    // 1. Generate JWT tokens for testing
    console.log('[1/5] Generating JWT test tokens for Instructor (ID 1) & Learner (ID 2)...');
    tokenInstructor = jwt.sign({ user_id: 1, email: 'alice@uiu.ac.bd' }, JWT_SECRET, { expiresIn: '1h' });
    tokenLearner = jwt.sign({ user_id: 2, email: 'bob@uiu.ac.bd' }, JWT_SECRET, { expiresIn: '1h' });
    const instructorId = 1;
    const learnerId = 2;
    console.log('✔ Generated test tokens successfully.');

    // Find active classroom
    const [rooms] = await db.query(
      `SELECT c.classroom_id, c.classroom_name, c.room_number, c.room_password 
       FROM classrooms c
       JOIN classroom_members cm ON c.classroom_id = cm.classroom_id
       WHERE cm.user_id = ? AND cm.role = 'instructor' AND c.is_active = true
       LIMIT 1`,
      [instructorId]
    );

    if (rooms.length === 0) {
      throw new Error('No test classroom found for instructor.');
    }

    classroomId = rooms[0].classroom_id;
    console.log(`Using classroom ID ${classroomId} (${rooms[0].classroom_name}).`);

    // Ensure learner is enrolled
    const [existingMem] = await db.query(
      `SELECT member_id FROM classroom_members WHERE classroom_id = ? AND user_id = ?`,
      [classroomId, learnerId]
    );
    if (existingMem.length === 0) {
      await db.query(
        `INSERT INTO classroom_members (user_id, classroom_id, role) VALUES (?, ?, 'learner')`,
        [learnerId, classroomId]
      );
      console.log(`Enrolled learner ID ${learnerId} into classroom.`);
    }

    // 2. Test Configurable Attendance Threshold
    console.log('\n[2/5] Testing Configurable Attendance Threshold...');
    const updateRes = await request(
      `${BASE_URL}/classrooms/${classroomId}/settings`,
      {
        method: 'PUT',
        headers: { Authorization: `Bearer ${tokenInstructor}` },
        body: JSON.stringify({
          classroom_name: rooms[0].classroom_name,
          room_password: rooms[0].room_password,
          visibility: 'private',
          is_paid: false,
          attendance_threshold_percent: 85
        })
      }
    );
    console.log('Update settings response:', updateRes.message);

    const getRoomRes = await request(`${BASE_URL}/classrooms/${classroomId}`, {
      headers: { Authorization: `Bearer ${tokenInstructor}` }
    });
    
    const roomInfo = getRoomRes.data;
    console.log('Fetched room info threshold:', roomInfo.attendance_threshold_percent);
    
    if (parseInt(roomInfo.attendance_threshold_percent, 10) !== 85) {
      throw new Error(`Attendance threshold percent failed to update in database! Got ${roomInfo.attendance_threshold_percent}`);
    }
    console.log('✔ Configurable Attendance Threshold updated and verified (85%).');

    // Reset back to default 75%
    await request(
      `${BASE_URL}/classrooms/${classroomId}/settings`,
      {
        method: 'PUT',
        headers: { Authorization: `Bearer ${tokenInstructor}` },
        body: JSON.stringify({
          classroom_name: rooms[0].classroom_name,
          room_password: rooms[0].room_password,
          visibility: 'private',
          is_paid: false,
          attendance_threshold_percent: 75
        })
      }
    );

    // 3. Test Consolidated Gradings Endpoint
    console.log('\n[3/5] Testing Consolidated Gradings Endpoint...');
    const gradingsRes = await request(
      `${BASE_URL}/classrooms/${classroomId}/gradings?filter=all&sort=date`,
      { headers: { Authorization: `Bearer ${tokenInstructor}` } }
    );
    console.log(`Fetched ${gradingsRes.data.length} consolidated submissions.`);
    if (gradingsRes.data.length > 0) {
      const sample = gradingsRes.data[0];
      console.log('Sample submission record:', {
        learner_name: sample.learner_name,
        homework_title: sample.homework_title,
        question_title: sample.question_title,
        submission_type: sample.submission_type,
        is_graded: sample.is_graded,
        score: sample.score
      });
    }
    console.log('✔ GET /api/classrooms/:id/gradings endpoint verified successfully.');

    // 4. Test Submission Heatmap with homework_id Filter
    console.log('\n[4/5] Testing Per-Homework Submission Heatmap...');
    const [hwList] = await db.query(`SELECT homework_id FROM homework WHERE classroom_id = ? LIMIT 1`, [classroomId]);
    let targetHwId = hwList.length > 0 ? hwList[0].homework_id : null;

    const heatmapAllRes = await request(`${BASE_URL}/users/me/submission-heatmap`, {
      headers: { Authorization: `Bearer ${tokenLearner}` }
    });
    console.log(`Unfiltered heatmap returned ${heatmapAllRes.data.length} date entries.`);

    if (targetHwId) {
      const heatmapHwRes = await request(`${BASE_URL}/users/me/submission-heatmap?homework_id=${targetHwId}`, {
        headers: { Authorization: `Bearer ${tokenLearner}` }
      });
      console.log(`Filtered heatmap (homework_id=${targetHwId}) returned ${heatmapHwRes.data.length} date entries.`);
    }
    console.log('✔ GET /api/users/me/submission-heatmap?homework_id=X verified.');

    // 5. Test Leave Classroom Endpoint
    console.log('\n[5/5] Testing Student Leave Classroom Endpoint...');
    // Create temporary classroom for testing leave
    const [tempRoomResult] = await db.query(
      `INSERT INTO classrooms (creator_id, room_number, room_password, classroom_name) VALUES (?, ?, ?, ?)`,
      [instructorId, `LEAVE${Date.now()}`, 'pass123', 'Temporary Leave Classroom']
    );
    const tempClassroomId = tempRoomResult.insertId;

    await db.query(
      `INSERT INTO classroom_members (user_id, classroom_id, role) VALUES (?, ?, 'learner')`,
      [learnerId, tempClassroomId]
    );
    console.log(`Learner joined temp classroom ID ${tempClassroomId}.`);

    const leaveRes = await request(`${BASE_URL}/classrooms/${tempClassroomId}/leave`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenLearner}` }
    });
    console.log('Leave response:', leaveRes.message);

    const [checkMem] = await db.query(
      `SELECT member_id FROM classroom_members WHERE classroom_id = ? AND user_id = ?`,
      [tempClassroomId, learnerId]
    );
    if (checkMem.length > 0) {
      throw new Error('Learner membership row was NOT removed after leaving!');
    }
    console.log('✔ DELETE /api/classrooms/:id/leave verified (membership removed).');

    // Cleanup temp classroom
    await db.query(`DELETE FROM classrooms WHERE classroom_id = ?`, [tempClassroomId]);

    console.log('\n🎉 ALL PART 4 VERIFICATION TESTS PASSED SUCCESSFULLY!');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Test failed:', err.message);
    process.exit(1);
  }
}

runTests();
