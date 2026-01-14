const { createMeeting, getMeetingById, getLatestLiveMeeting } = require('../repositories/meetingRepository');
const { upsertMinuteWindow } = require('../repositories/minuteRepository');

const LLMService = require('../services/LLMService');
const SimulationService = require('../services/SimulationService');
const AutomationService = require('../services/AutomationService');
const { DEMO_MODE } = require('../config/env');

/**
 * POST /api/ingest/chunk
 * 
 * Receives caption chunks and writes them to Firestore.
 * Frontend real-time listeners will receive updates automatically.
 * 
 * Requirements: 3.1, 4.1, 4.2, 4.3, 4.4, 4.5
 */
/**
 * POST /api/ingest/webhook
 * 
 * Handles batches from Transcriptonic Chrome Extension.
 * Maps them to the latest active meeting.
 */
exports.ingestWebhook = async (req, res) => {
    try {
        console.log('[Webhook] Received payload size:', JSON.stringify(req.body).length);

        let transcriptBatch = [];

        // Handle "Advanced" mode
        if (req.body.transcript && Array.isArray(req.body.transcript)) {
            transcriptBatch = req.body.transcript;
        }

        if (transcriptBatch.length === 0) {
            console.log('[Webhook] No transcript data found in body');
            return res.status(200).json({ success: true, message: 'No data processed' });
        }

        // Find the most recent LIVE meeting to attach this data to
        const liveMeeting = await getLatestLiveMeeting();

        if (!liveMeeting) {
            console.log('[Webhook] No live meeting found to attach data to.');
            return res.status(404).json({ error: 'No live meeting found' });
        }

        const meetingId = liveMeeting.id || liveMeeting._id;
        console.log(`[Webhook] Attaching ${transcriptBatch.length} chunks to meeting ${meetingId}`);

        // Process each chunk
        // Optimization: We could use batch upsert here in Mongo, but for now loop 
        // as per existing logic but using Mongo $set.
        for (const block of transcriptBatch) {
            const windowStart = new Date(block.timestamp);
            windowStart.setSeconds(0, 0);
            const windowEnd = new Date(windowStart);
            windowEnd.setMinutes(windowEnd.getMinutes() + 1);

            await upsertMinuteWindow(meetingId, {
                startTime: windowStart,
                endTime: windowEnd,
                transcript: block.transcriptText,
                speaker: block.personName,
                processed: false,
            });

            // Trigger automation detection for each block
            AutomationService.processChunk(meetingId, {
                text: block.transcriptText,
                speaker: block.personName,
                timestamp: block.timestamp
            }).catch(err => console.error('[Webhook] Automation Error:', err));
        }

        res.status(200).json({ success: true });
    } catch (error) {
        console.error('[ingestWebhook] Error:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
};

exports.ingestChunk = async (req, res) => {
    try {
        const { meetingId, text, timestamp, speaker } = req.body;
        console.log('[Ingest] Received chunk:', { meetingId, text, timestamp, speaker });

        // Validate required fields (Requirement 4.5)
        if (!meetingId) {
            return res.status(400).json({
                error: 'Validation failed',
                details: ['meetingId is required']
            });
        }
        if (!text) {
            return res.status(400).json({
                error: 'Validation failed',
                details: ['text is required']
            });
        }
        if (!timestamp) {
            return res.status(400).json({
                error: 'Validation failed',
                details: ['timestamp is required']
            });
        }
        if (!speaker) {
            return res.status(400).json({
                error: 'Validation failed',
                details: ['speaker is required']
            });
        }

        // If Demo Mode, ignore ingest (Requirement 4.3)
        if (DEMO_MODE) {
            return res.status(200).json({ message: 'Ingest ignored in Demo Mode' });
        }

        // Verify meeting exists (Requirement 4.4)
        const meeting = await getMeetingById(meetingId);
        if (!meeting) {
            return res.status(404).json({ error: 'Meeting not found' });
        }

        // Parse timestamp and calculate minute window boundaries
        const chunkTime = new Date(timestamp);
        const windowStart = new Date(chunkTime);
        windowStart.setSeconds(0, 0);
        const windowEnd = new Date(windowStart);
        windowEnd.setMinutes(windowEnd.getMinutes() + 1);

        // Write transcript to Firestore MinuteWindow (Requirement 3.1, 4.2)
        // Frontend real-time listeners will receive updates automatically
        await upsertMinuteWindow(meetingId, {
            startTime: windowStart,
            endTime: windowEnd,
            transcript: text,
            speaker: speaker,
            processed: false,
        });

        // Trigger Automation Detection (Async - do not await/block response)
        AutomationService.processChunk(meetingId, {
            text,
            speaker: speaker, // Assuming speaker object or string
            timestamp: chunkTime
        }).catch(err => console.error('[Ingest] Automation Error:', err));

        res.status(200).json({ success: true });
    } catch (error) {
        console.error('[ingestChunk]', error.message);
        res.status(500).json({ error: 'Ingest failed' });
    }
};

/**
 * POST /api/ingest/start-simulation
 * 
 * Starts a simulated meeting that generates realistic data.
 * Data is written directly to Firestore (no Socket.IO).
 * 
 * Requirements: 6.1, 6.2
 */
exports.startSimulation = async (req, res) => {
    try {
        const { title } = req.body;

        // Create a new meeting in Firestore (Requirement 6.2)
        const meeting = await createMeeting({
            title: title || 'Simulation Meeting',
            status: 'live',
            startTime: new Date(),
        });

        // Start simulation service (writes directly to Firestore, no Socket.IO)
        SimulationService.startSimulation(meeting.id);

        res.status(200).json({
            success: true,
            meetingId: meeting.id,
            message: 'Simulation started',
        });
    } catch (error) {
        console.error('[startSimulation]', error.message);
        res.status(500).json({ error: 'Simulation failed' });
    }
};
