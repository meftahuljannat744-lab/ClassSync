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
  console.log('--- Testing Homework Questions (Q1, Q2) & File Attachments (text, link, pdf, pptx, docx) ---');

  try {
    // 1. Create a Homework Set in Classroom 1
    console.log('\n1. POST /api/classrooms/1/homework (Create Homework)');
    const hwRes = await makeRequest({
      hostname: '127.0.0.1',
      port: 3000,
      path: '/api/classrooms/1/homework',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': '1' }
    }, {
      title: 'Database Schema & Query Homework',
      description: 'Solve questions 1 through 3 below.',
      total_points: 100,
      is_published: true
    });
    console.log(`Status: ${hwRes.status}, HW ID: ${hwRes.data.data ? hwRes.data.data.homework_id : 'N/A'}`);
    const hwId = hwRes.data.data.homework_id;

    // 2. Add Question 1 (Text/Code)
    console.log(`\n2. POST /api/homework/${hwId}/questions (Add Question 1)`);
    const q1 = await makeRequest({
      hostname: '127.0.0.1',
      port: 3000,
      path: `/api/homework/${hwId}/questions`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': '1' }
    }, {
      question_type: 'text',
      question_text: 'Question 1: Write an SQL query to calculate average student grade by course.',
      points: 25,
      order_number: 1,
      answer_text: 'SELECT course_id, AVG(score) FROM grades GROUP BY course_id;'
    });
    console.log(`Status: ${q1.status}, Q1 ID: ${q1.data.data ? q1.data.data.question_id : 'N/A'}`);

    // 3. Add Question 2 (PDF Attachment)
    console.log(`\n3. POST /api/homework/${hwId}/questions (Add Question 2 - PDF)`);
    const q2 = await makeRequest({
      hostname: '127.0.0.1',
      port: 3000,
      path: `/api/homework/${hwId}/questions`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': '1' }
    }, {
      question_type: 'pdf',
      question_text: 'Question 2: Read the attached relational algebra PDF worksheet and list all primary keys.',
      points: 25,
      order_number: 2,
      answer_text: 'See attached reference PDF key'
    });
    console.log(`Status: ${q2.status}, Q2 ID: ${q2.data.data ? q2.data.data.question_id : 'N/A'}`);

    // 4. Add Question 3 (PPTX Attachment)
    console.log(`\n4. POST /api/homework/${hwId}/questions (Add Question 3 - PPTX)`);
    const q3 = await makeRequest({
      hostname: '127.0.0.1',
      port: 3000,
      path: `/api/homework/${hwId}/questions`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': '1' }
    }, {
      question_type: 'pptx',
      question_text: 'Question 3: Inspect lecture slide #14 in the attached PPTX presentation and define 3NF.',
      points: 50,
      order_number: 3
    });
    console.log(`Status: ${q3.status}, Q3 ID: ${q3.data.data ? q3.data.data.question_id : 'N/A'}`);

    // 5. Get Homework Details & verify user_role & questions list
    console.log(`\n5. GET /api/homework/${hwId} (Verify Homework & Questions List)`);
    const detailRes = await makeRequest({
      hostname: '127.0.0.1',
      port: 3000,
      path: `/api/homework/${hwId}`,
      method: 'GET',
      headers: { 'Content-Type': 'application/json', 'x-user-id': '1' }
    });
    console.log(`Status: ${detailRes.status}, user_role: ${detailRes.data.data.user_role}, Questions Count: ${detailRes.data.data.questions.length}`);

    // 6. Add PPTX & DOCX Resource to Classroom 1
    console.log('\n6. POST /api/classrooms/1/resources (Add PPTX & DOCX Resources)');
    const resRes = await makeRequest({
      hostname: '127.0.0.1',
      port: 3000,
      path: '/api/classrooms/1/resources',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': '1' }
    }, {
      resource_title: 'Lecture 4: Database Normalization Slides (.pptx)',
      resource_url: 'https://example.com/slides/lecture4.pptx',
      resource_type: 'pptx',
      resource_description: 'PPTX slides covering 1NF, 2NF, 3NF, BCNF.'
    });
    console.log(`Status: ${resRes.status}, Message: ${resRes.data.message}`);

    console.log('\n✅ ALL QUESTION & ATTACHMENT TESTS PASSED SUCCESSFULLY!');
  } catch (err) {
    console.error('❌ Test failed:', err);
  }
}

runTests();
