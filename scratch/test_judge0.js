const axios = require('axios');
axios.post('https://judge0-ce.p.rapidapi.com/submissions?base64_encoded=false&wait=true', { source_code: 'print("Hello")', language_id: 71 }).catch(e => console.log(e.response?.status, e.response?.data));
