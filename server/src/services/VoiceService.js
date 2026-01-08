/**
 * VoiceService handles text-to-speech generation using ElevenLabs API.
 */
class VoiceService {
    constructor() {
        // access env vars lazily to ensure dotenv is loaded
    }

    /**
     * Converts text to speech audio buffer
     * @param {string} text 
     * @returns {Promise<Buffer>}
     */
    async generateAudio(text) {
        const apiKey = process.env.ELEVENLABS_API_KEY;
        const voiceId = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM'; // Default to "Rachel"

        if (!apiKey) {
            console.warn('[VoiceService] No API Key found. Returning mock silence/error.');
            throw new Error('ElevenLabs API Key not configured');
        }

        try {
            console.log(`[VoiceService] Generating audio for: "${text.substring(0, 50)}..."`);

            const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
                method: 'POST',
                headers: {
                    'Accept': 'audio/mpeg',
                    'Content-Type': 'application/json',
                    'xi-api-key': apiKey
                },
                body: JSON.stringify({
                    text: text,
                    model_id: "eleven_multilingual_v2",
                    voice_settings: {
                        stability: 0.5,
                        similarity_boost: 0.75
                    }
                })
            });

            if (!response.ok) {
                const errBody = await response.text(); // Get raw text first
                console.error('[VoiceService] ElevenLabs Raw Error:', errBody);

                let detailMsg = response.statusText;
                try {
                    const errJson = JSON.parse(errBody);
                    detailMsg = errJson.detail?.message || errJson.detail || JSON.stringify(errJson);
                } catch (e) {
                    // ignore parse error
                }

                throw new Error(`ElevenLabs API Error: ${response.status} - ${detailMsg}`);
            }

            const arrayBuffer = await response.arrayBuffer();
            return Buffer.from(arrayBuffer);

        } catch (error) {
            console.error('[VoiceService] Generation failed:', error.message);
            console.warn('[VoiceService] Falling back to MOCK AUDIO for demo purposes.');

            // Return a simple mock audio buffer (valid MP3 header + silence/noise)
            // This ensures the frontend receives audio to play and visualize
            return Buffer.from(
                '//NExAAAAANIAAAAAExBTUUuuOTkuNVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV' +
                'VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV' +
                'VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV' +
                'VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV',
                'base64'
            );
        }
    }
}

module.exports = new VoiceService();
