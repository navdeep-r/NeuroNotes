const Meeting = require('../models/Meeting');
const MinuteWindow = require('../models/MinuteWindow');
const LLMService = require('../services/LLMService');
const SimulationService = require('../services/SimulationService');
const { DEMO_MODE } = require('../config/env');

// POST /api/ingest/chunk
exports.ingestChunk = async (req, res) => {
    try {
        const { meetingId, text, timestamp, speaker } = req.body;

        // If Demo Mode, we might ignore this or use it to seed
        if (DEMO_MODE) {
            return res.status(200).json({ message: 'Ingest ignored in Demo Mode' });
        }

        // Real Logic:
        // 1. Find or create minute window
        // 2. Append text
        // 3. Emit via Socket
        // 4. Async process with LLM

        // For now, minimal implementation
        const io = global.io;
        io.to(meetingId).emit('transcript_update', { text, timestamp, speaker });

        // TODO: Persistence

        res.status(200).json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ingest failed' });
    }
};

// POST /api/ingest/start-simulation
exports.startSimulation = async (req, res) => {
    try {
        const { title } = req.body;

        // Create a dummy meeting
        const meeting = await Meeting.create({
            title: title || 'Simulation Meeting',
            status: 'live',
            startTime: new Date()
        });

        // Start simulation service
        const io = global.io;
        SimulationService.startSimulation(meeting._id.toString(), io);

        res.status(200).json({
            success: true,
            meetingId: meeting._id,
            message: 'Simulation started'
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Simulation failed' });
    }
};
