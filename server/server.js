const http = require('http');
const { Server } = require('socket.io');
const app = require('./src/app');
const connectDB = require('./src/config/db');
const { PORT } = require('./src/config/env');

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*', // Allow all for now, restrict in production
        methods: ['GET', 'POST']
    }
});

// Database Connection
connectDB();

// Socket.IO Connection Handler
io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    socket.on('join_meeting', (meetingId) => {
        socket.join(meetingId);
        console.log(`Socket ${socket.id} joined meeting ${meetingId}`);
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

// Make io accessible globally or pass it to routes later
global.io = io;

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
