const { GROK_API_KEY, DEMO_MODE } = require('../config/env');

class LLMService {
    constructor() {
        this.apiKey = GROK_API_KEY;
        this.baseUrl = 'https://api.x.ai/v1/chat/completions';
        this.modelName = 'grok-beta'; // or 'grok-2-latest'
        this.demoMode = DEMO_MODE;
    }

    /**
     * Helper to call Grok API via fetch (OpenAI compatible)
     * @param {string} prompt - The text prompt
     * @param {boolean} isJsonMode - Whether to request JSON response (via system prompt)
     * @returns {string} - The generated text
     */
    async _callGrok(prompt, isJsonMode = false) {
        if (!this.apiKey) {
            throw new Error('Grok API Key missing');
        }

        const systemMessage = isJsonMode
            ? "You are a helpful assistant. Output ONLY valid JSON."
            : "You are a helpful assistant.";

        const body = {
            model: this.modelName,
            messages: [
                { role: "system", content: systemMessage },
                { role: "user", content: prompt }
            ],
            stream: false,
            temperature: 0.3
        };

        const response = await fetch(this.baseUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            let errorMsg = `HTTP Error ${response.status} ${response.statusText}`;
            try {
                const errorData = await response.json();
                if (errorData.error && errorData.error.message) {
                    errorMsg = `Grok API Error: ${errorData.error.message}`;
                }
            } catch (e) {
                // connection error or non-json response
            }

            // Map standard codes
            if (response.status === 401) throw new Error('401 Unauthorized - Invalid Grok API Key');
            if (response.status === 429) throw new Error('429 Too Many Requests - Quota Exceeded');

            throw new Error(errorMsg);
        }

        const data = await response.json();

        if (!data.choices || data.choices.length === 0) {
            return '';
        }

        // Extract text from OpenAI-compatible response
        return data.choices[0].message.content;
    }

    /**
     * Refines a minute window of transcript text into actionable insights.
     */
    async processWindow(transcript) {
        if (!this.apiKey || this.demoMode) {
            return this.mockProcess(transcript);
        }

        const prompt = `
            Analyze the following meeting transcript snippet and extract:
            1. Action Items (things someone needs to do)
            2. Decisions (agreements or choices made)
            3. Visual Candidates (data or concepts that would be well-represented as a chart or graph)

            Transcript: "${transcript}"

            Return ONLY a JSON object in this format:
            {
                "actions": [{"content": string, "assignee": string}],
                "decisions": [{"content": string, "confidence": number}],
                "visualCandidates": [{"text": string, "context": string, "type": "bar"|"line"|"pie"}]
            }
        `;

        try {
            const text = await this._callGrok(prompt, true);

            // Clean markdown code blocks if present
            const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();

            return JSON.parse(cleanText);
        } catch (error) {
            console.error('[LLMService] Grok Process Error:', error.message);
            return this.mockProcess(transcript);
        }
    }

    /**
     * Handles free-form chat queries or command triggers.
     */
    async query(context, userQuery) {
        if (!this.apiKey || this.demoMode) {
            return "I'm currently in demo mode or the Grok API key is missing.";
        }

        const fullPrompt = `
            You are NeuroNotes AI, an intelligent meeting assistant. 
            Below is the transcript context of the current meeting. 
            Answer the user's question or execute their command based on this context.
            If the user uses a command like /summary, /insights, /actions, provide exactly that.

            --- MEETING CONTEXT ---
            ${context}
            --- END CONTEXT ---

            USER QUERY: ${userQuery}

            Response (keep it concise and professional):
        `;

        try {
            return await this._callGrok(fullPrompt, false);
        } catch (error) {
            console.error('[LLMService] Grok Query Error:', error.message);
            return `Sorry, I encountered an error while processing your request with Grok: ${error.message}`;
        }
    }

    mockProcess(transcript) {
        const lower = transcript.toLowerCase();
        const actions = [];
        const decisions = [];
        const visualCandidates = [];

        if (lower.includes('action item') || lower.includes('to do')) {
            actions.push({ content: transcript, assignee: 'Team' });
        }
        if (lower.includes('decided') || lower.includes('agreed')) {
            decisions.push({ content: transcript, confidence: 0.9 });
        }
        if (lower.includes('sales') || lower.includes('growth') || lower.includes('chart')) {
            visualCandidates.push({ text: transcript, context: 'growth_trend', type: 'line' });
        }

        return { actions, decisions, visualCandidates };
    }
}

module.exports = new LLMService();
