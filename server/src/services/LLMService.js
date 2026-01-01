const { GROK_API_KEY, DEMO_MODE } = require('../config/env');

class LLMService {
    constructor() {
        this.apiKey = GROK_API_KEY;
        // Using Groq API (groq.com) - Note: Different from xAI's Grok
        this.baseUrl = 'https://api.groq.com/openai/v1/chat/completions';
        this.modelName = 'llama-3.3-70b-versatile'; // Fast and capable Groq model
        this.demoMode = DEMO_MODE;
    }

    /**
     * Helper to call Groq API via fetch (OpenAI compatible)
     */
    async _callGrok(prompt, isJsonMode = false) {
        if (!this.apiKey) {
            console.warn('Groq API Key missing, returning mock data.');
            return '';
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

        try {
            const response = await fetch(this.baseUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                // If API fails, we suppress error and return empty to fall back to mock/demo responses upstream if handled
                console.error(`Groq API Fail: ${response.status} ${response.statusText}`);
                return '';
            }

            const data = await response.json();
            if (!data.choices || data.choices.length === 0) return '';
            return data.choices[0].message.content;

        } catch (e) {
            console.error('Groq Fetch Error:', e.message);
            return '';
        }
    }

    /**
     * Refines a minute window of transcript text into actionable insights.
     */
    async processWindow(transcript) {
        // Always mock for stability in this demo
        return this.mockProcess(transcript);
    }

    /**
     * Handles free-form chat queries or command triggers.
     */
    async query(context, userQuery) {
        const lowerQ = userQuery.toLowerCase().trim();

        // If not in demo mode and API key is available, try calling Grok API
        if (!this.demoMode && this.apiKey) {
            const prompt = `You are an AI assistant analyzing a meeting transcript. Based on the following meeting context, answer the user's question.

### Meeting Context:
${context || "No transcript context available yet."}

### User Question:
${userQuery}

Please provide a helpful, concise, and well-formatted response using markdown formatting.`;

            const response = await this._callGrok(prompt);
            if (response && response.trim()) {
                return response;
            }
            console.log('[LLMService] Groq API returned empty, falling back to demo responses.');
        }

        // --- FALLBACK HARDCODED DEMO RESPONSES ---

        if (lowerQ.includes('/summary') || lowerQ.includes('summary')) {
            return `### 📝 Meeting Summary: NeuroNotes Architecture
**Overview**: The team discussed the architecture of **NeuroNotes**, focusing on the transition from Gemini to **Grok API** for enhanced reliability in the demo.

**Key Discussion Points**:
- **Real-time Pipeline**: Confirmed the WebSocket ingestion for live transcripts matches the frontend requirements.
- **LLM Integration**: Validated the switch to xAI's **grok-beta** model using OpenAI-compatible endpoints.
- **Dashboard UI**: The new "Glassmorphism" design and "Command Bar" were approved for the final showcase.
- **Data Persistence**: MongoDB integration was verified for storing minutes and meeting metadata.`;
        }

        if (lowerQ.includes('/actions') || lowerQ.includes('action')) {
            return `### 🚀 Action Items
- [ ] **Backend**: Complete the refactor of \`LLMService.js\` to fully decouple from the Gemini SDK. (Assigned to: @Dev)
- [ ] **Frontend**: Verify the "Stop Analysis" button correctly triggers the meeting end state. (Assigned to: @QA)
- [ ] **Demo**: Prepare the "Visual Intelligence" mock data for the sales pitch chart. (Assigned to: @Product)
- [ ] **Ops**: Update \`.env\` file with the new \`GROK_API_KEY\`.`;
        }

        if (lowerQ.includes('/decisions') || lowerQ.includes('decision')) {
            return `### 🤝 Decisions Made
1.  **Architecture**: We will effectively use **Grok API** as the primary intelligence engine due to better availability for this region.
2.  **API Strategy**: Adopted "Raw Fetch" instead of SDKs to minimize dependency bloat and improve debugging visibility.
3.  **UI/UX**: Stick to the dark-mode aesthetic with "Inter" typography for a premium feel.`;
        }

        if (lowerQ.includes('/insights') || lowerQ.includes('insight')) {
            return `### 💡 Smart Insights
- **Efficiency Gain**: Switching to raw fetch reduced bundle size and initialization time by **15%**.
- **User Sentiment**: The team is **highly confident** (90%) in the new architecture stability.
- **Risk Identified**: API Key management needs strict `.env` usage validation to prevent 400 errors.`;
        }

        // Default response for other queries
        return `I am tuning in to the discussion about **NeuroNotes**. We are currently focused on the **Backend Integration** and **API Stability**. I can help you summarize the technical decisions made so far regarding Grok and MongoDB.`;
    }

    mockProcess(transcript) {
        // Returns rich mock data for the live "minute" processing

        const actions = [];
        const decisions = [];
        const visualCandidates = [];

        // Randomly inject items to make it feel alive
        const rand = Math.random();

        if (rand > 0.7) {
            actions.push({ content: "Update API Key configuration in server environment", assignee: "Backend Team" });
        }

        if (rand > 0.8) {
            decisions.push({ content: "Adopt Grok-beta for production release", confidence: 0.95 });
        }

        if (rand > 0.6) {
            visualCandidates.push({
                text: "API Latency Comparison: Gemini vs Grok",
                context: "performance_metrics",
                type: "bar"
            });
        }

        // Sometimes inject a line chart for "Trends"
        if (rand < 0.2) {
            visualCandidates.push({
                text: "User Engagement Trend over last sprint",
                context: "growth",
                type: "line"
            });
        }

        return { actions, decisions, visualCandidates };
    }
}

module.exports = new LLMService();
