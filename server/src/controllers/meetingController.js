const Meeting = require('../models/Meeting');
const { ActionItem, Decision } = require('../models/Insight');
const VisualArtifact = require('../models/VisualArtifact');

// GET /api/meetings
exports.getMeetings = async (req, res) => {
    try {
        const meetings = await Meeting.find().sort({ createdAt: -1 });
        res.json(meetings);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET /api/meetings/:id
exports.getMeetingDetails = async (req, res) => {
    try {
        const meeting = await Meeting.findById(req.params.id);
        if (!meeting) return res.status(404).json({ error: 'Meeting not found' });
        res.json(meeting);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET /api/meetings/:id/artifacts
exports.getMeetingArtifacts = async (req, res) => {
    try {
        const { id } = req.params;
        const actions = await ActionItem.find({ meetingId: id });
        const decisions = await Decision.find({ meetingId: id });
        const visuals = await VisualArtifact.find({ meetingId: id });

        res.json({
            actions,
            decisions,
            visuals
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
