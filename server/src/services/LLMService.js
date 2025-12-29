const { GEMINI_API_KEY, GROK_API_KEY, DEMO_MODE } = require('../config/env');

class LLMService {
    constructor() {
        this.demoMode = DEMO_MODE;
        // Initialize clients here if keys exist
    }

    async processWindow(transcript) {
        if (this.demoMode) {
            return this.mockProcess(transcript);
        }
        // TODO: Implement real LLM call
        // For now, fallback to mock if keys missing
        return this.mockProcess(transcript);
    }

    mockProcess(transcript) {
        // Simple deterministic logic for demo
        const lower = transcript.toLowerCase();
        const actions = [];
        const decisions = [];
        const visualCandidates = [];

        if (lower.includes('action item') || lower.includes('to do')) {
            actions.push({
                content: transcript,
                assignee: 'Team'
            });
        }

        if (lower.includes('decided') || lower.includes('agreed')) {
            decisions.push({
                content: transcript,
                confidence: 0.9
            });
        }

        // Visual triggers
        if (lower.includes('sales') || lower.includes('growth') || lower.includes('chart')) {
            visualCandidates.push({
                text: transcript,
                context: 'financial_growth'
            });
        }

        return { actions, decisions, visualCandidates };
    }

    async detectVisualCandidate(text) {
        if (this.demoMode) return false; // In demo mode, handled by processWindow primarily
        // Real logic would ask LLM: "Is this visualizable?"
        return false;
    }
}

module.exports = new LLMService();
