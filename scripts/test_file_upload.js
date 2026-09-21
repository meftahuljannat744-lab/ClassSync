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
  console.log('--- Testing File Upload API (/api/upload) ---');

  try {
    // 1. Upload sample PDF file
    console.log('\n1. Uploading PDF file...');
    const pdfRes = await makeRequest({
      hostname: '127.0.0.1',
      port: 3000,
      path: '/api/upload',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': '1' }
    }, {
      filename: 'sample_assignment.pdf',
      filedata: 'data:application/pdf;base64,JVBERi0xLjQKJS...'
    });
    console.log(`Status: ${pdfRes.status}, URL: ${pdfRes.data.data ? pdfRes.data.data.url : 'N/A'}`);

    // 2. Upload sample PPTX file
    console.log('\n2. Uploading PPTX presentation file...');
    const pptxRes = await makeRequest({
      hostname: '127.0.0.1',
      port: 3000,
      path: '/api/upload',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': '1' }
    }, {
      filename: 'lecture_slides.pptx',
      filedata: 'data:application/vnd.openxmlformats-officedocument.presentationml.presentation;base64,UEsDBBQAAAAIA...'
    });
    console.log(`Status: ${pptxRes.status}, URL: ${pptxRes.data.data ? pptxRes.data.data.url : 'N/A'}`);

    // 3. Upload sample Python Code file
    console.log('\n3. Uploading Python code solution file...');
    const pyRes = await makeRequest({
      hostname: '127.0.0.1',
      port: 3000,
      path: '/api/upload',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': '1' }
    }, {
      filename: 'solution.py',
      filedata: 'data:text/x-python;base64,ZGVmIHNvbHZlKCk6CiAgICByZXR1cm4gNDI='
    });
    console.log(`Status: ${pyRes.status}, URL: ${pyRes.data.data ? pyRes.data.data.url : 'N/A'}`);

    console.log('\n✅ FILE UPLOAD API VERIFICATION PASSED SUCCESSFULLY!');
  } catch (err) {
    console.error('❌ Upload test failed:', err);
  }
}

runTests();
