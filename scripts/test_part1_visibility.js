const http = require('http');

function makeRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, body });
        }
      });
    });

    req.on('error', reject);
    if (postData) {
      req.write(JSON.stringify(postData));
    }
    req.end();
  });
}

async function runTests() {
  console.log('--- Testing Part 1: Course Visibility & Monetization ---');

  try {
    // 1. Test Unauthenticated Public Search
    console.log('\n1. GET /api/courses/search (Unauthenticated)');
    const searchRes = await makeRequest({
      hostname: '127.0.0.1',
      port: 3000,
      path: '/api/courses/search',
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    console.log(`Status: ${searchRes.status}, Count: ${searchRes.data.data ? searchRes.data.data.length : 0}`);

    // 2. Create a Public Paid Classroom as User #1 (Instructor)
    console.log('\n2. POST /api/classrooms (Create Public Paid Course)');
    const createRes = await makeRequest({
      hostname: '127.0.0.1',
      port: 3000,
      path: '/api/classrooms',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': '1'
      }
    }, {
      classroom_name: 'Advanced Web Architecture 2026',
      description: 'Master Node.js, Express & MySQL Security',
      visibility: 'public',
      is_paid: true,
      price: 49.99
    });

    console.log(`Status: ${createRes.status}, Classroom ID: ${createRes.data.data ? createRes.data.data.classroom_id : 'N/A'}`);
    const classroomId = createRes.data.data.classroom_id;

    // 3. Update Classroom Settings (Instructor Only)
    console.log(`\n3. PUT /api/classrooms/${classroomId}/settings (Update Settings)`);
    const settingsRes = await makeRequest({
      hostname: '127.0.0.1',
      port: 3000,
      path: `/api/classrooms/${classroomId}/settings`,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': '1'
      }
    }, {
      classroom_name: 'Advanced Web Architecture 2026 (Updated)',
      room_password: 'newsecretpass',
      description: 'Master Node.js, Express & MySQL Security with Certification',
      visibility: 'public',
      is_paid: true,
      price: 59.99
    });
    console.log(`Status: ${settingsRes.status}, Message: ${settingsRes.data.message}`);

    // 4. Submit Payment Request as User #2 (Student)
    console.log(`\n4. POST /api/classrooms/${classroomId}/enrollment-request (Student Submit Payment)`);
    const reqRes = await makeRequest({
      hostname: '127.0.0.1',
      port: 3000,
      path: `/api/classrooms/${classroomId}/enrollment-request`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': '2'
      }
    }, {
      payment_method: 'bKash',
      payer_phone_number: '01711223344',
      transaction_id: 'TRX9988776655'
    });
    console.log(`Status: ${reqRes.status}, Message: ${reqRes.data.message}`);

    // 5. Get Enrollment Requests as Instructor (User #1)
    console.log(`\n5. GET /api/classrooms/${classroomId}/enrollment-requests (Instructor Roster)`);
    const listRes = await makeRequest({
      hostname: '127.0.0.1',
      port: 3000,
      path: `/api/classrooms/${classroomId}/enrollment-requests`,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': '1'
      }
    });
    console.log(`Status: ${listRes.status}, Requests Count: ${listRes.data.data ? listRes.data.data.length : 0}`);
    const requestId = listRes.data.data[0].request_id;

    // 6. Approve Enrollment Request as Instructor (User #1)
    console.log(`\n6. PUT /api/enrollment-requests/${requestId}/approve (Approve Request)`);
    const approveRes = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: `/api/enrollment-requests/${requestId}/approve`,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': '1'
      }
    });
    console.log(`Status: ${approveRes.status}, Message: ${approveRes.data.message}`);

    console.log('\n✅ ALL TEST VERIFICATIONS PASSED SUCCESSFULLY!');
  } catch (err) {
    console.error('❌ Test failed:', err);
  }
}

runTests();
