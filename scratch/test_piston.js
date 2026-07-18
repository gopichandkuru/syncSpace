const axios = require('axios');
async function test() {
  try {
    const res = await axios.post('https://emkc.org/api/v2/piston/execute', {
      language: 'cpp',
      version: '*',
      files: [{ content: '#include<iostream>\nint main(){ std::cout<<"Hello Piston"; return 0; }' }]
    });
    console.log(res.data);
  } catch (err) {
    console.log(err.response?.data || err.message);
  }
}
test();
