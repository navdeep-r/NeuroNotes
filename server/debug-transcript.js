const http = require('http');

const meetingId = '1yGd4MMD5wtixDhnsFQz'; // The id user got earlier

const req = http.request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/meetings/${meetingId}/transcript`,
    method: 'GET'
}, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
        console.log('Status:', res.statusCode);
        console.log('Body:', body);
    });
});
req.on('error', console.error);
req.end();
