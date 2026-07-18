const axios = require('axios');

async function testRender() {
  console.log('Testing Render Backend Execution API...');
  try {
    const res = await axios.post('https://syncspace-backend-44cl.onrender.com/api/v1/execute', {
      language: 'python',
      code: 'print("Hello from Render production backend!")\n'
    });
    console.log('[SUCCESS] Execution result:', res.data);
  } catch (e) {
    console.log('[ERROR]', e.response?.data || e.message);
  }
}
testRender();
