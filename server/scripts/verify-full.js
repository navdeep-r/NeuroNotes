const io = require('socket.io-client');
const http = require('http');

const socket = io('http://localhost:5000');
let meetingId = '';

console.log('Connecting to server...');

socket.on('connect', () => {
    console.log('Connected to Socket.IO server:', socket.id);
    startSimulation();
});

socket.on('connect_error', (err) => {
    console.error('Connection Error:', err.message);
});

socket.on('transcript_update', (data) => {
    console.log('[TRANSCRIPT]', data.speaker, ':', data.text);
});

socket.on('insight_generated', (insight) => {
    console.log('[INSIGHT]', insight.type, insight.data.content);
});

socket.on('visual_created', (visual) => {
    console.log('[VISUAL]', visual.title, 'Type:', visual.type);
    // End test after first visual or timeout
    setTimeout(() => {
        console.log('Verification Passed.');
        process.exit(0);
    }, 2000);
});

function startSimulation() {
    const data = JSON.stringify({
        title: 'Verification Meeting'
    });

    const req = http.request({
        hostname: 'localhost',
        port: 5000,
        path: '/api/ingest/simulation',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': data.length
        }
    }, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
            const response = JSON.parse(body);
            console.log('Simulation Started:', response);
            meetingId = response.meetingId;
            socket.emit('join_meeting', meetingId); // If I implemented rooms, I need this. 
            // Wait, in my code: io.to(meetingId).emit...
            // I need to implement 'join_meeting' in server.js or just emit to all if I was lazy.
            // Re-reading server.js... 
            // `io.on('connection', (socket) => { ... })` 
            // I DID NOT IMPLEMENT `socket.on('join_meeting')` to join the room!
            // The simulation emits to `io.to(meetingId)`.
            // So I need to fix server.js to allow joining rooms.
        });
    });

    req.on('error', (e) => {
        console.error('Request failed:', e);
    });

    req.write(data);
    req.end();
}
