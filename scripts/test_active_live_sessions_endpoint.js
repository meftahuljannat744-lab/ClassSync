const db = require('../src/config/db');
const jwt = require('jsonwebtoken');

async function testEndpoint() {
  try {
    const [users] = await db.query('SELECT user_id, email, full_name FROM users LIMIT 5');
    console.log('Sample users in DB:', users);
    if (users.length === 0) {
      console.log('No users found in database');
      process.exit(1);
    }

    const testUser = users[0];
    const token = jwt.sign(
      { user_id: testUser.user_id, email: testUser.email },
      process.env.JWT_SECRET || 'classsync_secret_key_2026',
      { expiresIn: '1h' }
    );

    console.log(`Testing GET /api/users/me/active-live-sessions for user ${testUser.full_name} (ID: ${testUser.user_id})...`);
    const res = await fetch('http://localhost:3000/api/users/me/active-live-sessions', {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('Active live sessions endpoint status:', res.status);
    const data = await res.json();
    console.log('Response data:', JSON.stringify(data, null, 2));

    process.exit(0);
  } catch (err) {
    console.error('Endpoint test error:', err);
    process.exit(1);
  }
}

testEndpoint();
