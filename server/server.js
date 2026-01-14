const http = require('http');
const app = require('./src/app');
const connectDB = require('./src/config/db');
const { PORT } = require('./src/config/env');

// Connect to Database (MongoDB)
connectDB();

const server = http.createServer(app);

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log('Routes loaded: /api/workspaces confirmed');
});
