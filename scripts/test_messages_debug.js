const db = require('../src/config/db');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'classsync_secret_jwt_key_2026';
const BASE_URL = 'http://localhost:3000/api';

async function request(url, token) {
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });
  const data = await res.json();
  return { status: res.status, data };
}

async function testMessages() {
  console.log('=== MESSAGES DEBUG TEST ===');

  const tokenInstructor = jwt.sign({ user_id: 1, email: 'alice@uiu.ac.bd' }, JWT_SECRET, { expiresIn: '1h' });
  const tokenLearner = jwt.sign({ user_id: 2, email: 'bob@uiu.ac.bd' }, JWT_SECRET, { expiresIn: '1h' });

  console.log('\n1. Testing Group Messages GET /classrooms/1/messages (Instructor)...');
  const msgRes = await request(`${BASE_URL}/classrooms/1/messages`, tokenInstructor);
  console.log('Status:', msgRes.status);
  console.log('Group Messages Data:', msgRes.data);

  console.log('\n2. Testing DM Contacts GET /classrooms/1/dm-contacts (Instructor)...');
  const contactsInstRes = await request(`${BASE_URL}/classrooms/1/dm-contacts`, tokenInstructor);
  console.log('Status:', contactsInstRes.status);
  console.log('Instructor DM Contacts:', contactsInstRes.data);

  console.log('\n3. Testing DM Contacts GET /classrooms/1/dm-contacts (Learner)...');
  const contactsLearnRes = await request(`${BASE_URL}/classrooms/1/dm-contacts`, tokenLearner);
  console.log('Status:', contactsLearnRes.status);
  console.log('Learner DM Contacts:', contactsLearnRes.data);

  process.exit(0);
}

testMessages();
