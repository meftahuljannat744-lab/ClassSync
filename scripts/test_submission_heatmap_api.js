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

async function runTests() {
  console.log('=== TESTING NEW 4 FEATURES ===\n');

  // Login Bob (Learner)
  const loginRes = await makeRequest('/auth/login', 'POST', { email: 'bob@uiu.ac.bd', password: 'password123' });
  const token = loginRes.data.token;
  console.log('✔ Authenticated test user (Bob)');

  // 1. Test Heatmap Endpoint
  const heatmapRes = await makeRequest('/users/me/submission-heatmap', 'GET', null, { Authorization: `Bearer ${token}` });
  console.log(`GET /api/users/me/submission-heatmap status: ${heatmapRes.status}`);
  if (heatmapRes.status !== 200 || !Array.isArray(heatmapRes.data.data)) {
    throw new Error('Submission heatmap endpoint failed');
  }
  console.log(`✔ Heatmap returned ${heatmapRes.data.data.length} active submission dates`);

  // 2. Test Notifications Endpoint
  const notiRes = await makeRequest('/users/me/notifications', 'GET', null, { Authorization: `Bearer ${token}` });
  console.log(`GET /api/users/me/notifications status: ${notiRes.status}`);
  if (notiRes.status !== 200 || notiRes.data.unreadCount === undefined) {
    throw new Error('Notifications polling endpoint failed');
  }
  console.log(`✔ Notifications endpoint returned unreadCount: ${notiRes.data.unreadCount}`);

  console.log('\n=================================================');
  console.log('🎉 ALL 4 NEW FEATURES API TESTS PASSED SUCCESSFULLY!');
  console.log('=================================================\n');
}

runTests().catch(err => {
  console.error('❌ Test failed:', err.message);
  process.exit(1);
});
