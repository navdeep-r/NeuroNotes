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
 * All intents (scheduling, visualization) detected via "hey neuro ... over" pattern.
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

        const automationResults = [];

        // Process each chunk
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

            // Process transcript via unified automation pipeline
            // Detects "hey neuro ... over" and routes to:
            // - Visualization intent -> auto-generates chart
            // - Scheduling intent -> creates pending action for approval
            const result = await AutomationService.processChunk(meetingId, {
                text: block.transcriptText,
                speaker: block.personName
            });

            if (result) {
                automationResults.push(result);
            }
        }

        // Separate visualization and automation results
        const visualizations = automationResults.filter(r => r.type === 'visualization').map(r => r.visual);
        const automations = automationResults.filter(r => r.intent); // AutomationLog entries

        res.status(200).json({
            success: true,
            visualizationsGenerated: visualizations.length,
            visualizations: visualizations.map(v => ({ id: v._id || v.id, title: v.title })),
            automationsCreated: automations.length
        });
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

        // Write transcript to MinuteWindow
        await upsertMinuteWindow(meetingId, {
            startTime: windowStart,
            endTime: windowEnd,
            transcript: text,
            speaker: speaker,
            processed: false,
        });

        // Process transcript via unified automation pipeline
        // Detects "hey neuro ... over" and routes to appropriate intent handler
        const result = await AutomationService.processChunk(meetingId, { text, speaker });

        const response = { success: true };

        if (result) {
            if (result.type === 'visualization' && result.visual) {
                console.log(`[Ingest] Visualization generated: ${result.visual.title}`);
                response.visualization = {
                    id: result.visual._id || result.visual.id,
                    title: result.visual.title
                };
            } else if (result.intent) {
                console.log(`[Ingest] Automation created: ${result.intent}`);
                response.automation = {
                    id: result._id || result.id,
                    intent: result.intent,
                    status: result.status
                };
            }
        }

        res.status(200).json(response);
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

/**
 * POST /api/ingest/test-visualization
 * 
 * Test endpoint to simulate visualization trigger flow for a specific meeting.
 * Uses the unified "hey neuro ... over" pattern.
 */
exports.testVisualization = async (req, res) => {
    try {
        const { meetingId } = req.body;

        if (!meetingId) {
            return res.status(400).json({ error: 'meetingId is required' });
        }

        // Verify meeting exists
        const meeting = await getMeetingById(meetingId);
        if (!meeting) {
            return res.status(404).json({ error: 'Meeting not found' });
        }

        console.log(`[TestVisualization] Testing for meeting ${meetingId}`);

        // Simulate the unified trigger flow with "hey neuro ... over"
        const testCommand = 'Hey NeuroNotes, create a chart showing Q1 revenue $500K, Q2 $750K, Q3 $1.2 million, Q4 $1.5 million. Over.';

        const result = await AutomationService.processChunk(meetingId, {
            text: testCommand,
            speaker: 'Test User'
        });

        if (result && result.type === 'visualization' && result.visual) {
            res.status(200).json({
                success: true,
                message: 'Visualization created!',
                visual: {
                    id: result.visual._id || result.visual.id,
                    title: result.visual.title,
                    type: result.visual.type,
                    description: result.visual.description
                }
            });
        } else {
            res.status(200).json({
                success: false,
                message: 'No visualization was generated. Check server logs.',
                hint: 'Use format: "Hey NeuroNotes, create a chart about [data]. Over."'
            });
        }
    } catch (error) {
        console.error('[testVisualization]', error);
        res.status(500).json({ error: 'Test failed', details: error.message });
    }
};
