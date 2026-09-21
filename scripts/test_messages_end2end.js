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
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
  return data;
}

async function runTest() {
  console.log('=== MESSAGES END-TO-END VERIFICATION ===\n');

  try {
    const tokenInstructor = jwt.sign({ user_id: 1, email: 'alice@uiu.ac.bd' }, JWT_SECRET, { expiresIn: '1h' });
    const tokenLearner = jwt.sign({ user_id: 2, email: 'bob@uiu.ac.bd' }, JWT_SECRET, { expiresIn: '1h' });

    // 1. Post group message
    console.log('[1/4] Posting group chat message as Learner...');
    const postGroupRes = await request(`${BASE_URL}/classrooms/1/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenLearner}` },
      body: JSON.stringify({ message_text: 'Hello class! Verification test message.' })
    });
    console.log('✔ Group message posted ID:', postGroupRes.data.message_id);

    // 2. Fetch group messages
    console.log('\n[2/4] Fetching group chat messages...');
    const groupMsgsRes = await request(`${BASE_URL}/classrooms/1/messages`, {
      headers: { Authorization: `Bearer ${tokenInstructor}` }
    });
    console.log(`✔ Fetched ${groupMsgsRes.data.length} group messages.`);
    const lastMsg = groupMsgsRes.data[groupMsgsRes.data.length - 1];
    console.log('Latest message:', { sender: lastMsg.sender_name, text: lastMsg.message_text });

    // 3. Fetch DM Contacts
    console.log('\n[3/4] Fetching DM Contacts list for Learner & Instructor...');
    const learnerContacts = await request(`${BASE_URL}/classrooms/1/dm-contacts`, {
      headers: { Authorization: `Bearer ${tokenLearner}` }
    });
    console.log(`✔ Learner contacts count: ${learnerContacts.data.length} (Target: Instructors/TAs).`);

    const instructorContacts = await request(`${BASE_URL}/classrooms/1/dm-contacts`, {
      headers: { Authorization: `Bearer ${tokenInstructor}` }
    });
    console.log(`✔ Instructor contacts count: ${instructorContacts.data.length} (Target: All members).`);

    // 4. Send Direct Message from Learner to Instructor
    console.log('\n[4/4] Sending Direct Message from Learner (ID 2) to Instructor (ID 1)...');
    const dmPostRes = await request(`${BASE_URL}/classrooms/1/dm/1`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenLearner}` },
      body: JSON.stringify({ message_text: 'Hi Dr. Alice, I have a question about HW 1.' })
    });
    console.log('✔ Direct message sent ID:', dmPostRes.data.message_id);

    const getDmsRes = await request(`${BASE_URL}/classrooms/1/dm/2`, {
      headers: { Authorization: `Bearer ${tokenInstructor}` }
    });
    console.log(`✔ Instructor fetched ${getDmsRes.data.messages.length} direct messages with Learner.`);

    console.log('\n🎉 ALL MESSAGES VERIFICATION TESTS PASSED CLEANLY!');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Verification failed:', err.message);
    process.exit(1);
  }
}

runTest();
