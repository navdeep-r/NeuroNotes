const LLMService = require('../services/LLMService');
const VoiceService = require('../services/VoiceService');
const { getMeetingById } = require('../repositories/meetingRepository');
const { getMinutesByMeeting } = require('../repositories/minuteRepository');

/**
 * POST /api/voice/interact
 * 
 * Handles voice interaction:
 * 1. Receives user query (text) + meetingId
 * 2. Fetches meeting context (transcript)
 * 3. LLM generates grounded text response
 * 4. VoiceService generates audio (ElevenLabs)
 * 5. Returns { text, audio } (audio as base64 or stream)
 */
exports.handleVoiceInteraction = async (req, res) => {
    try {
        const { meetingId, query } = req.body;

        if (!meetingId || !query) {
            return res.status(400).json({ error: 'MeetingID and query are required' });
        }

        // 1. Get Context
        const meeting = await getMeetingById(meetingId);
        if (!meeting) {
            return res.status(404).json({ error: 'Meeting not found' });
        }

        const minutes = await getMinutesByMeeting(meetingId);
        // Construct context from segments or fallback transcript
        const context = minutes.flatMap(m => {
            if (m.segments && m.segments.length > 0) {
                return m.segments.map(s => `[${s.speaker}]: ${s.text}`);
            }
            return m.transcript ? [`[${m.speaker || 'Unknown'}]: ${m.transcript}`] : [];
        }).join('\n');

        // 2. LLM Response (Grounded)
        // We'll add a specialized method in LLMService for this
        const textResponse = await LLMService.generateVoiceResponse(context, query);

        // 3. Audio Generation
        // Returns a buffer
        const audioBuffer = await VoiceService.generateAudio(textResponse);
        console.log(`[VoiceController] Generated Audio Buffer Size: ${audioBuffer.length} bytes`);

        // Convert buffer to base64 for easy JSON transport
        // Alternatively we could stream, but JSON is simpler for this prototype
        const audioBase64 = audioBuffer.toString('base64');

        res.json({
            text: textResponse,
            audio: audioBase64
        });

    } catch (err) {
        console.error('[handleVoiceInteraction] Error:', err);

        // Handle specific known errors for better UX
        if (err.message.includes('ElevenLabs API Key')) {
            return res.status(503).json({ error: 'ElevenLabs API Key is missing in server .env' });
        }

        if (err.message.includes('ElevenLabs API Error')) {
            return res.status(502).json({ error: 'Voice Generation Service Failed (Quota or API Error)' });
        }

        res.status(500).json({ error: 'Failed to process voice interaction' });
    }
};
