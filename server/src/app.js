const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const ingestRoutes = require('./routes/ingest.routes');
const meetingRoutes = require('./routes/meeting.routes');

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Routes
app.use('/api/ingest', ingestRoutes);
app.use('/api/meetings', meetingRoutes);

app.get('/', (req, res) => {
    res.send('Neuro_notes Backend Running');
});

// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

module.exports = app;
