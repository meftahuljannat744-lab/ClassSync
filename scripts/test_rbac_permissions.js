const http = require('http');

const BASE_URL = 'http://localhost:3000/api';

const makeRequest = (path, method = 'GET', body = null, headers = {}) => {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const reqHeaders = { 'Content-Type': 'application/json', ...headers };
    let payload = null;
    if (body) {
      payload = JSON.stringify(body);
      reqHeaders['Content-Length'] = Buffer.byteLength(payload);
    }

    const req = http.request(url, { method, headers: reqHeaders }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
};

async function loginUser(email, password) {
  const res = await makeRequest('/auth/login', 'POST', { email, password });
  if (res.status !== 200 || !res.data.token) {
    throw new Error(`Login failed for ${email}: ${JSON.stringify(res.data)}`);
  }
  return { token: res.data.token, user: res.data.user };
}

async function runRbacTests() {
  console.log('=== STARTING CLASS-SYNC RBAC & PERMISSION AUDIT TESTS ===\n');

  // 1. Authenticate users
  const alice = await loginUser('alice@uiu.ac.bd', 'password123'); // Instructor
  const bob = await loginUser('bob@uiu.ac.bd', 'password123');     // Learner
  const diana = await loginUser('diana@uiu.ac.bd', 'password123');   // TA

  console.log('✔ Successfully logged in Alice (Instructor), Bob (Learner), and Diana (TA)');

  // 2. Fetch classroom list to get a valid classroom ID
  const aliceRooms = await makeRequest('/classrooms', 'GET', null, { Authorization: `Bearer ${alice.token}` });
  if (!aliceRooms.data.data || aliceRooms.data.data.length === 0) {
    throw new Error('No classrooms found for testing');
  }
  const classroomId = aliceRooms.data.data[0].classroom_id;
  console.log(`✔ Using test classroom ID: ${classroomId}`);

  // Ensure Bob & Diana are members of classroom
  const memRes = await makeRequest(`/classrooms/${classroomId}`, 'GET', null, { Authorization: `Bearer ${alice.token}` });
  const roomNum = memRes.data.data.room_number;
  const roomPass = memRes.data.data.room_password;

  const bobMember = memRes.data.data.members.find(m => m.user_id === bob.user.user_id);
  if (!bobMember) {
    await makeRequest('/classrooms/join', 'POST', { room_number: roomNum, room_password: roomPass }, { Authorization: `Bearer ${bob.token}` });
    console.log('✔ Joined Bob to classroom for testing');
  }

  const dianaMember = memRes.data.data.members.find(m => m.user_id === diana.user.user_id);
  if (!dianaMember) {
    await makeRequest('/classrooms/join', 'POST', { room_number: roomNum, room_password: roomPass }, { Authorization: `Bearer ${diana.token}` });
  }
  const updatedMem = await makeRequest(`/classrooms/${classroomId}`, 'GET', null, { Authorization: `Bearer ${alice.token}` });
  const dianaMemObj = updatedMem.data.data.members.find(m => m.user_id === diana.user.user_id);
  if (dianaMemObj && dianaMemObj.role !== 'TA') {
    await makeRequest(`/classrooms/${classroomId}/members/${dianaMemObj.member_id}/role`, 'POST', { role: 'TA' }, { Authorization: `Bearer ${alice.token}` });
    console.log('✔ Promoted Diana to TA for testing');
  }

  // -------------------------------------------------------------
  // TEST 1: Instructor-Only Route Protection (Create Homework)
  // -------------------------------------------------------------
  console.log('\n--- TEST 1: Instructor-Only Action (Create Homework) ---');
  
  // Alice (Instructor) -> Should succeed
  const createHwAlice = await makeRequest(`/classrooms/${classroomId}/homework`, 'POST', {
    title: 'RBAC Test HW ' + Date.now(),
    description: 'Testing RBAC',
    total_points: 100
  }, { Authorization: `Bearer ${alice.token}` });
  console.log(`Alice (Instructor) create HW status: ${createHwAlice.status} (Expected: 201)`);
  if (createHwAlice.status !== 201) throw new Error('Instructor failed to create homework');
  const testHwId = createHwAlice.data.data.homework_id;

  // Bob (Learner) -> Should be 403 Forbidden
  const createHwBob = await makeRequest(`/classrooms/${classroomId}/homework`, 'POST', {
    title: 'Illegal HW by Learner',
    total_points: 100
  }, { Authorization: `Bearer ${bob.token}` });
  console.log(`Bob (Learner) create HW status: ${createHwBob.status} (Expected: 403)`);
  if (createHwBob.status !== 403) throw new Error('Learner was improperly allowed to create homework!');

  // Diana (TA) -> Should be 403 Forbidden (Homework creation is Instructor-only)
  const createHwDiana = await makeRequest(`/classrooms/${classroomId}/homework`, 'POST', {
    title: 'Illegal HW by TA',
    total_points: 100
  }, { Authorization: `Bearer ${diana.token}` });
  console.log(`Diana (TA) create HW status: ${createHwDiana.status} (Expected: 403)`);
  if (createHwDiana.status !== 403) throw new Error('TA was improperly allowed to create homework!');

  // -------------------------------------------------------------
  // TEST 2: Add Question & Answer Key (Instructor)
  // -------------------------------------------------------------
  console.log('\n--- TEST 2: Add Question with Answer Key ---');
  const addQRes = await makeRequest(`/homework/${testHwId}/questions`, 'POST', {
    question_type: 'text',
    question_text: 'What is 2 + 2 in SQL?',
    points: 10,
    answer_text: 'SELECT 2 + 2;'
  }, { Authorization: `Bearer ${alice.token}` });
  console.log(`Alice add question status: ${addQRes.status} (Expected: 201)`);
  const questionId = addQRes.data.data.question_id;

  // Publish homework set
  await makeRequest(`/homework/${testHwId}/publish`, 'PUT', { is_published: true }, { Authorization: `Bearer ${alice.token}` });

  // -------------------------------------------------------------
  // TEST 3: Post-Submission Answer Key Lock & Unlock for Learner
  // -------------------------------------------------------------
  console.log('\n--- TEST 3: Answer Key Access Control (Pre vs Post Submission) ---');
  
  // Bob (Learner before submitting) -> Should be 403 Locked
  const ansKeyBefore = await makeRequest(`/questions/${questionId}/answer`, 'GET', null, { Authorization: `Bearer ${bob.token}` });
  console.log(`Bob answer key access BEFORE submission: ${ansKeyBefore.status} (Expected: 403 Locked)`);
  if (ansKeyBefore.status !== 403) throw new Error('Learner accessed answer key before submitting solution!');

  // Alice (Instructor) -> Should be allowed anytime
  const ansKeyAlice = await makeRequest(`/questions/${questionId}/answer`, 'GET', null, { Authorization: `Bearer ${alice.token}` });
  console.log(`Alice answer key access: ${ansKeyAlice.status} (Expected: 200)`);

  // Bob submits solution
  await makeRequest(`/questions/${questionId}/submit`, 'POST', { code_content: 'SELECT 4;' }, { Authorization: `Bearer ${bob.token}` });
  console.log('✔ Bob submitted solution for question');

  // Bob (Learner AFTER submitting) -> Should be 200 Unlocked
  const ansKeyAfter = await makeRequest(`/questions/${questionId}/answer`, 'GET', null, { Authorization: `Bearer ${bob.token}` });
  console.log(`Bob answer key access AFTER submission: ${ansKeyAfter.status} (Expected: 200 Unlocked)`);
  if (ansKeyAfter.status !== 200) throw new Error('Learner failed to access answer key after submitting solution!');

  // -------------------------------------------------------------
  // TEST 4: Learner Alerts Filtering (Staff vs Learner)
  // -------------------------------------------------------------
  console.log('\n--- TEST 4: Learner Alerts Filtering ---');
  // Issue alert to Bob
  await makeRequest(`/classrooms/${classroomId}/alerts`, 'POST', {
    learner_id: bob.user.user_id,
    alert_type: 'yellow',
    alert_message: 'Testing RBAC alert filter'
  }, { Authorization: `Bearer ${alice.token}` });

  const alertsStaff = await makeRequest(`/classrooms/${classroomId}/alerts`, 'GET', null, { Authorization: `Bearer ${alice.token}` });
  console.log(`Staff alerts returned: ${alertsStaff.data.data.length} records`);

  const alertsBob = await makeRequest(`/classrooms/${classroomId}/alerts`, 'GET', null, { Authorization: `Bearer ${bob.token}` });
  console.log(`Bob (Learner) alerts returned: ${alertsBob.data.data.length} records`);
  const hasOtherLearners = alertsBob.data.data.some(a => a.learner_id !== bob.user.user_id);
  if (hasOtherLearners) {
    throw new Error('Learner saw warning alerts belonging to other learners!');
  }
  console.log('✔ Learner correctly sees ONLY their own warning alerts');

  console.log('\n=================================================');
  console.log('🎉 ALL RBAC AND PERMISSION AUDIT TESTS PASSED SUCCESSFULLY!');
  console.log('=================================================\n');
}

runRbacTests().catch(err => {
  console.error('\n❌ RBAC TEST FAILED:', err.message);
  process.exit(1);
});
