const https = require('https');
https.get('https://syncspace-frontend-05u3.onrender.com/', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    const match = data.match(/assets\/[a-zA-Z0-9_-]+\.js/);
    if (match) {
      console.log('JS Bundle:', match[0]);
      https.get('https://syncspace-frontend-05u3.onrender.com/' + match[0], (res2) => {
        let jsData = '';
        res2.on('data', (chunk) => jsData += chunk);
        res2.on('end', () => {
          console.log('Found worker.min.mjs?', jsData.includes('pdf.worker.min.mjs'));
          console.log('Found handleRunCode?', jsData.includes('handleRunCode'));
        });
      });
    } else {
      console.log('No JS bundle found in index.html');
    }
  });
});
