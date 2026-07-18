const axios = require('axios');
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function pollRender() {
  console.log('Polling Render Backend Execution API...');
  for (let i = 0; i < 30; i++) {
    try {
      const res = await axios.post('https://syncspace-backend-44cl.onrender.com/api/v1/execute', {
        language: 'python',
        code: 'print("Hello from Render production backend!")\n'
      });
      console.log('\n[SUCCESS] Execution result:', res.data);
      return;
    } catch (e) {
      process.stdout.write('.');
    }
    await sleep(5000);
  }
  console.log('\nTimed out waiting for Render deployment to update.');
}
pollRender();
