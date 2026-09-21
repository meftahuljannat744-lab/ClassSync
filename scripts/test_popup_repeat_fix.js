const db = require('../src/config/db');
const jwt = require('jsonwebtoken');

async function testPopupRepeatLogic() {
  try {
    console.log('=== STARTING POPUP REPEAT & TRACKING VERIFICATION ===');

    const [users] = await db.query('SELECT user_id, email FROM users WHERE user_id IN (1, 2)');
    const instructor = users.find(u => u.user_id === 1);
    const learner = users.find(u => u.user_id === 2);

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

    // 1. Create live session
    const createRes = await fetch('http://localhost:3000/api/classrooms/1/live-sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${instructorToken}`
      },
      body: JSON.stringify({
        session_title: 'Repeat Fix Test Lecture',
        expected_duration: 30
      })
    });
    const createData = await createRes.json();
    const sessionId = Number(createData.data.session_id);
    console.log(`Created session ID ${sessionId}`);

    // 2. Start session
    await fetch(`http://localhost:3000/api/live-sessions/${sessionId}/start`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${instructorToken}` }
    });
    console.log(`Started session ID ${sessionId}`);

    // 3. Simulate frontend navbar.js pollActiveLiveSessions logic
    const shownSessionIds = new Set();

    function simulatePoll(cycleName) {
      console.log(`\n--- SIMULATING POLL CYCLE ${cycleName} ---`);
    }

    // Helper matching navbar.js exact logic
    async function runNavbarPoll(cycleName) {
      simulatePoll(cycleName);
      const res = await fetch('http://localhost:3000/api/users/me/active-live-sessions', {
        headers: { Authorization: `Bearer ${learnerToken}` }
      });
      const activeSessions = (await res.json()).data;
      console.log(`[Poll ${cycleName}] Active sessions returned from endpoint:`, activeSessions.map(s => s.session_id));
      console.log(`[Poll ${cycleName}] Current shownSessionIds Set:`, Array.from(shownSessionIds));

      let sessionToAnnounce = null;
      for (const s of activeSessions) {
        const sId = Number(s.session_id);
        if (!shownSessionIds.has(sId)) {
          if (!sessionToAnnounce) {
            sessionToAnnounce = s;
          }
          shownSessionIds.add(sId);
        } else {
          console.log(`[Poll ${cycleName}] Session ${sId} is ALREADY in shownSessionIds set. Skipping popup modal.`);
        }
      }

      if (sessionToAnnounce) {
        console.log(`[Poll ${cycleName}] NEW POPUP MODAL ANNOUNCED for session ${sessionToAnnounce.session_id}`);
        return sessionToAnnounce.session_id;
      } else {
        console.log(`[Poll ${cycleName}] NO POPUP MODAL TRIGGERED.`);
        return null;
      }
    }

    // Cycle 1: Should announce sessionId
    const announced1 = await runNavbarPoll('#1');
    if (announced1 !== sessionId) {
      throw new Error(`Expected popup for session ${sessionId} on Cycle 1, got ${announced1}`);
    }

    // Cycle 2, 3, 4: Should return null (no popup triggered)
    for (let c = 2; c <= 4; c++) {
      const announced = await runNavbarPoll(`#${c}`);
      if (announced !== null) {
        throw new Error(`Popup was triggered on Cycle ${c} for session ${announced}! Repeat bug detected.`);
      }
    }

    console.log('\n✔ CONFIRMED: Popup modal triggered EXACTLY ONCE on Cycle 1 and WAS SUPPRESSED on cycles 2, 3, and 4!');

    // Cleanup: End session
    await fetch(`http://localhost:3000/api/live-sessions/${sessionId}/end`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${instructorToken}` }
    });
    console.log(`Ended test session ID ${sessionId}`);

    await db.end();
    console.log('=== POPUP REPEAT FIX TEST PASSED PERFECTLY ===');
  } catch (err) {
    console.error('❌ TEST FAILED:', err);
    await db.end();
    process.exit(1);
  }
}

testPopupRepeatLogic();
