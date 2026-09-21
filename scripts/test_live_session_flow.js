const db = require('../src/config/db');
const jwt = require('jsonwebtoken');

async function runTest() {
  try {
    console.log('=== STARTING LIVE SESSION END-TO-END VERIFICATION ===');

    // 1. Get instructor (user_id = 1) and learner (user_id = 2)
    const [users] = await db.query('SELECT user_id, email, full_name FROM users WHERE user_id IN (1, 2)');
    const instructor = users.find(u => u.user_id === 1);
    const learner = users.find(u => u.user_id === 2);

    if (!instructor || !learner) {
      throw new Error('Instructor or Learner user missing in DB');
    }

    const instructorToken = jwt.sign(
      { user_id: instructor.user_id, email: instructor.email },
      process.env.JWT_SECRET || 'classsync_secret_key_2026',
      { expiresIn: '1h' }
    );

    const learnerToken = jwt.sign(
      { user_id: learner.user_id, email: learner.email },
      process.env.JWT_SECRET || 'classsync_secret_key_2026',
      { expiresIn: '1h' }
    );

    // 2. Create a test live session as instructor in classroom 1
    console.log('1. Creating test live session in Classroom #1...');
    const createRes = await fetch('http://localhost:3000/api/classrooms/1/live-sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${instructorToken}`
      },
      body: JSON.stringify({
        session_title: 'Automated Test Live Lecture',
        session_description: 'E2E test live session flow',
        expected_duration: 45
      })
    });

    const createData = await createRes.json();
    console.log('Create session status:', createRes.status, createData);
    if (!createData.success) throw new Error('Failed to create live session');

    const sessionId = createData.data.session_id;

    // 3. Poll active live sessions as learner BEFORE start
    console.log('2. Polling active live sessions as Learner BEFORE start...');
    const poll1Res = await fetch('http://localhost:3000/api/users/me/active-live-sessions', {
      headers: { Authorization: `Bearer ${learnerToken}` }
    });
    const poll1Data = await poll1Res.json();
    console.log('Active sessions before start (should be empty):', poll1Data.data);
    if (poll1Data.data.length !== 0) {
      throw new Error('Expected 0 active sessions before start, but found some');
    }

    // 4. Start the live session as instructor
    console.log(`3. Starting live session ${sessionId} as Instructor...`);
    const startRes = await fetch(`http://localhost:3000/api/live-sessions/${sessionId}/start`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${instructorToken}` }
    });
    const startData = await startRes.json();
    console.log('Start session response:', startData);
    if (!startData.success) throw new Error('Failed to start session');

    // 5. Poll active live sessions as learner AFTER start
    console.log('4. Polling active live sessions as Learner AFTER start...');
    const poll2Res = await fetch('http://localhost:3000/api/users/me/active-live-sessions', {
      headers: { Authorization: `Bearer ${learnerToken}` }
    });
    const poll2Data = await poll2Res.json();
    console.log('Active sessions after start (MUST have active session):', poll2Data.data);
    if (poll2Data.data.length === 0 || poll2Data.data[0].session_id !== sessionId) {
      throw new Error('Active session endpoint did NOT return the started session!');
    }
    console.log('✔ ACTIVE SESSION ENDPOINT SUCCESSFULLY RETURNED THE STARTED SESSION!');

    // 6. End the live session as instructor
    console.log(`5. Ending live session ${sessionId} as Instructor...`);
    const endRes = await fetch(`http://localhost:3000/api/live-sessions/${sessionId}/end`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${instructorToken}` }
    });
    const endData = await endRes.json();
    console.log('End session response:', endData);
    if (!endData.success) throw new Error('Failed to end session');

    // 7. Poll active live sessions as learner AFTER end
    console.log('6. Polling active live sessions as Learner AFTER end...');
    const poll3Res = await fetch('http://localhost:3000/api/users/me/active-live-sessions', {
      headers: { Authorization: `Bearer ${learnerToken}` }
    });
    const poll3Data = await poll3Res.json();
    console.log('Active sessions after end (should be empty):', poll3Data.data);
    if (poll3Data.data.length !== 0) {
      throw new Error('Expected 0 active sessions after end, but found some');
    }

    console.log('=== ALL E2E LIVE SESSION TESTS PASSED PERFECTLY! ===');
    await db.end();
  } catch (err) {
    console.error('❌ TEST FAILURE:', err);
    await db.end();
    process.exit(1);
  }
}

runTest();
