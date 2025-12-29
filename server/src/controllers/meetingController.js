const { createMeeting, getMeetingById, getAllMeetings } = require('../repositories/meetingRepository');
const { getArtifactsByMeeting } = require('../repositories/insightRepository');
const { getVisualsByMeeting } = require('../repositories/visualRepository');
const { transformMeeting, transformAction, transformDecision, transformVisual } = require('../utils/transformers');

// Default query limit to prevent unbounded reads (Requirement 10.4)
const DEFAULT_LIMIT = 50;

/**
 * GET /api/meetings
 * 
 * Returns all meetings sorted by createdAt descending.
 * 
 * Requirements: 7.1, 7.5, 10.4
 */
exports.getMeetings = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || DEFAULT_LIMIT;

        // Get meetings from Firestore (already sorted by createdAt desc)
        const meetings = await getAllMeetings(limit);

        // Transform to frontend format (Requirement 8.1)
        const transformedMeetings = meetings.map(meeting => transformMeeting(meeting));

        res.json(transformedMeetings);
    } catch (err) {
        console.error('[getMeetings]', err.message);
        res.status(500).json({ error: 'Failed to retrieve meetings' });
    }
};

/**
 * GET /api/meetings/:id
 * 
 * Returns a single meeting by ID.
 * 
 * Requirements: 7.2, 7.4, 7.5
 */
exports.getMeetingDetails = async (req, res) => {
    try {
        const meeting = await getMeetingById(req.params.id);

        // Return 404 if meeting not found (Requirement 7.4)
        if (!meeting) {
            return res.status(404).json({ error: 'Meeting not found' });
        }

        // Transform to frontend format (Requirement 8.1)
        res.json(transformMeeting(meeting));
    } catch (err) {
        console.error('[getMeetingDetails]', err.message);
        res.status(500).json({ error: 'Failed to retrieve meeting' });
    }
};

/**
 * GET /api/meetings/:id/artifacts
 * 
 * Returns all actions, decisions, and visuals for a meeting.
 * 
 * Requirements: 7.3, 7.4, 7.5
 */
exports.getMeetingArtifacts = async (req, res) => {
    try {
        const { id } = req.params;

        // Verify meeting exists (Requirement 7.4)
        const meeting = await getMeetingById(id);
        if (!meeting) {
            return res.status(404).json({ error: 'Meeting not found' });
        }

        // Get artifacts from Firestore
        const { actions, decisions } = await getArtifactsByMeeting(id);
        const visuals = await getVisualsByMeeting(id);

        // Transform to frontend format (Requirements 8.2, 8.3, 8.4)
        res.json({
            actions: actions.map(action => transformAction(action)),
            decisions: decisions.map(decision => transformDecision(decision)),
            visuals: visuals.map(visual => transformVisual(visual)),
        });
    } catch (err) {
        console.error('[getMeetingArtifacts]', err.message);
        res.status(500).json({ error: 'Failed to retrieve artifacts' });
    }
};

/**
 * POST /api/meetings
 * 
 * Creates a new meeting.
 */
exports.createMeeting = async (req, res) => {
    try {
        const { title } = req.body;
        const meeting = await createMeeting({
            title: title || 'New Meeting',
            status: 'live',
            startTime: new Date(),
        });
        res.status(201).json(transformMeeting(meeting));
    } catch (err) {
        console.error('[createMeeting]', err.message);
        res.status(500).json({ error: 'Failed to create meeting' });
    }
};
