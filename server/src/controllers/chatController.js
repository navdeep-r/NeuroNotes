const LLMService = require('../services/LLMService');
const { getMinutesByMeeting } = require('../repositories/minuteRepository');

/**
 * POST /api/chat/query
 * 
 * Handles user chat queries and command triggers.
 */
exports.handleQuery = async (req, res) => {
    try {
        const { meetingId, query } = req.body;

        if (!meetingId) {
            return res.status(400).json({ error: 'meetingId is required' });
        }
        if (!query) {
            return res.status(400).json({ error: 'query is required' });
        }

        // Get recent transcript for context (last 20 mins or chunks)
        const minutes = await getMinutesByMeeting(meetingId);
        const context = minutes
            .sort((a, b) => a.startTime - b.startTime)
            .map(m => `${m.speaker}: ${m.transcript}`)
            .join('\n');

        // Handle specific command triggers
        let modifiedQuery = query;
        if (query.startsWith('/summary')) {
            modifiedQuery = "Please provide a concise summary of this meeting so far, highlighting the main topics and overall sentiment.";
        } else if (query.startsWith('/actions')) {
            modifiedQuery = "List all the specific action items or tasks mentioned in this meeting, along with who is responsible if mentioned.";
        } else if (query.startsWith('/insights')) {
            modifiedQuery = "What are the key insights, trends, or major takeaways from this discussion so far?";
        } else if (query.startsWith('/decisions')) {
            modifiedQuery = "List all the final decisions or agreements made during this meeting.";
        }

        const response = await LLMService.query(context, modifiedQuery);

        res.json({ response });
    } catch (error) {
        console.error('[chatController] Error:', error);
        res.status(500).json({ error: 'Failed to process chat query' });
    }
};
