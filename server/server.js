const http = require('http');
const app = require('./src/app');
const { initializeFirebase } = require('./src/config/firebase');
const { PORT } = require('./src/config/env');

// Initialize Firebase
initializeFirebase();

const server = http.createServer(app);

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
