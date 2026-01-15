const { getMeetingById } = require('../repositories/meetingRepository');
const { getMinutesByMeeting } = require('../repositories/minuteRepository');
const { getArtifactsByMeeting } = require('../repositories/insightRepository');
const LLMService = require('../services/LLMService');

/**
 * GET /api/meetings/:id/insights
 * 
 * Returns comprehensive analytics for a completed meeting
 */
exports.getMeetingInsights = async (req, res) => {
    try {
        const { id } = req.params;

        // Verify meeting exists
        const meeting = await getMeetingById(id);
        if (!meeting) {
            return res.status(404).json({ error: 'Meeting not found' });
        }

        // Get transcript segments
        const minutes = await getMinutesByMeeting(id);
        
        // Flatten all segments
        const allSegments = minutes.flatMap(m => {
            if (m.segments && m.segments.length > 0) {
                return m.segments;
            }
            return m.transcript ? [{ speaker: m.speaker || 'Unknown', text: m.transcript }] : [];
        });

        // Build full transcript string
        const fullTranscript = allSegments
            .map(s => `[${s.speaker}]: ${s.text}`)
            .join('\n');

        // Get artifacts for decision/action counts
        const { actions, decisions } = await getArtifactsByMeeting(id);

        // Generate analytics via LLM
        const analytics = await LLMService.generateMeetingAnalytics(fullTranscript, allSegments);

        // Override counts with actual data if available
        if (actions && actions.length > 0) {
            analytics.actionCount = actions.length;
        }
        if (decisions && decisions.length > 0) {
            analytics.decisionCount = decisions.length;
        }

        // Add meeting metadata
        analytics.meetingTitle = meeting.title;
        analytics.meetingDate = meeting.startTime;
        analytics.meetingDuration = meeting.endTime && meeting.startTime
            ? Math.round((new Date(meeting.endTime) - new Date(meeting.startTime)) / 60000)
            : null;
        analytics.status = meeting.status;

        // Include summary if available
        if (meeting.summary) {
            analytics.summary = meeting.summary;
        }

        console.log(`[Insights] Generated analytics for meeting ${id}`);
        res.json(analytics);

    } catch (err) {
        console.error('[getMeetingInsights]', err.message);
        res.status(500).json({ error: 'Failed to generate insights' });
    }
};
