/**
 * VisualizationTriggerService
 * 
 * Parses transcript line-by-line to detect visualization triggers.
 * 
 * Trigger Phrases (case-insensitive):
 * - START: "Hey NeuroNotes" + visualization intent (create/make/show + visualization/visual/chart/graph)
 *   Examples: "Hey NeuroNotes, create a visualization"
 *             "Hey NeuroNotes, make a chart"
 *             "Hey NeuroNotes, show me a visual"
 * 
 * - STOP: "thanks neuronotes" or "done neuronotes" or "that's it neuronotes"
 * 
 * When START is detected, begins capturing transcript content.
 * When STOP is detected, sends captured content to LLM for visualization generation.
 */

const LLMService = require('./LLMService');
const VisualEngine = require('./VisualEngine');
const { createVisual } = require('../repositories/visualRepository');

class VisualizationTriggerService {
    constructor() {
        // Track active visualization sessions per meeting
        // Key: meetingId, Value: { isCapturing: boolean, capturedContent: string[], startTime: Date }
        this.sessions = new Map();

        // === TRIGGER PATTERNS ===

        // Original NeuroNotes wake word (kept for backward compatibility)
        this.WAKE_WORDS = [
            'hey neuronotes',
            'hey neuro notes',
            'hey neuro nodes',  // Common misheard
            'hey in your nodes', // Common misheard
            'a neuronotes',
            'a neuro notes'
        ];

        this.VISUALIZATION_INTENTS = [
            'create a visualization',
            'create visualization',
            'make a visualization',
            'make visualization',
            'create a visual',
            'make a visual',
            'show a visual',
            'show me a visual',
            'create a chart',
            'make a chart',
            'show a chart',
            'create a graph',
            'make a graph',
            'show a graph',
            'visualize this',
            'visualize that',
            'generate a chart',
            'generate a visual',
            'generate visualization'
        ];

        // NEW: Simple speech-friendly start triggers (standalone, no wake word needed)
        this.SIMPLE_START_TRIGGERS = [
            'start chart',
            'start the chart',
            'begin chart',
            'chart mode',
            'chart mode on',
            'capture data',
            'start visualization',
            'begin visualization',
            'record chart'
        ];

        // Original stop triggers (NeuroNotes-based)
        this.NEURONOTES_STOP_TRIGGERS = [
            'thanks neuronotes',
            'thanks neuro notes',
            'thank you neuronotes',
            'thank you neuro notes',
            'done neuronotes',
            'done neuro notes',
            'that\'s it neuronotes',
            'thats it neuronotes',
            'stop neuronotes',
            'cool neuronotes',
            'okay neuronotes done',
            'ok neuronotes done'
        ];

        // NEW: Simple speech-friendly stop triggers
        this.SIMPLE_STOP_TRIGGERS = [
            'end chart',
            'stop chart',
            'chart done',
            'chart complete',
            'finish chart',
            'chart mode off',
            'end visualization',
            'stop visualization',
            'generate now',
            'create now',
            'that\'s all for the chart',
            'thats all for the chart'
        ];
    }

    /**
     * Check if line contains a visualization start trigger
     */
    isStartTrigger(normalizedLine) {
        // Check simple triggers first (no wake word needed)
        if (this.SIMPLE_START_TRIGGERS.some(trigger => normalizedLine.includes(trigger))) {
            return true;
        }

        // Check wake word + intent combination
        const hasWakeWord = this.WAKE_WORDS.some(wake => normalizedLine.includes(wake));
        if (!hasWakeWord) {
            return false;
        }

        // Must contain a visualization intent
        return this.VISUALIZATION_INTENTS.some(intent => normalizedLine.includes(intent));
    }

    /**
     * Check if line contains a stop trigger
     */
    isStopTrigger(normalizedLine) {
        // Check simple triggers
        if (this.SIMPLE_STOP_TRIGGERS.some(trigger => normalizedLine.includes(trigger))) {
            return true;
        }

        // Check NeuroNotes-based triggers
        return this.NEURONOTES_STOP_TRIGGERS.some(trigger => normalizedLine.includes(trigger));
    }

    /**
     * Process a transcript line and check for visualization triggers
     * @param {string} meetingId - The meeting ID
     * @param {string} line - A single line of transcript text
     * @param {string} speaker - Who spoke this line
     * @param {string} sourceWindowId - The minute window ID for linking
     * @returns {Promise<{triggered: boolean, visual: object|null}>}
     */
    async processLine(meetingId, line, speaker, sourceWindowId) {
        const normalizedLine = line.toLowerCase().trim();

        // Get or create session for this meeting
        if (!this.sessions.has(meetingId)) {
            this.sessions.set(meetingId, {
                isCapturing: false,
                capturedContent: [],
                capturedSpeakers: new Set(),
                startTime: null,
                startSourceId: null
            });
        }

        const session = this.sessions.get(meetingId);

        // Track what content has been processed to avoid re-triggering
        if (!session.lastProcessedLength) {
            session.lastProcessedLength = 0;
        }

        // Only process new content (Chrome extension sends cumulative text)
        const newContent = normalizedLine.substring(session.lastProcessedLength);
        session.lastProcessedLength = normalizedLine.length;

        // Skip if no new content
        if (!newContent.trim()) {
            return { triggered: false, visual: null, status: 'idle' };
        }

        // Check if BOTH start and stop are in the new content (complete flow in one line)
        const hasStart = this.isStartTriggerInText(newContent);
        const hasStop = this.isStopTriggerInText(newContent);

        if (hasStart && hasStop) {
            // Both triggers in same chunk - extract content between them
            const extracted = this.extractContentBetweenTriggers(newContent);
            if (extracted) {
                console.log(`[VisualizationTrigger] COMPLETE FLOW detected in single line for meeting ${meetingId}`);
                console.log(`[VisualizationTrigger] Extracted content: "${extracted.substring(0, 100)}..."`);

                // Generate visualization directly from extracted content
                const visual = await this.generateVisualization(
                    meetingId,
                    [`[${speaker}]: ${extracted}`],
                    [speaker],
                    sourceWindowId
                );

                return { triggered: true, visual, status: 'completed' };
            }
        }

        // Check for STOP trigger FIRST (if already capturing)
        if (session.isCapturing && hasStop) {
            console.log(`[VisualizationTrigger] STOP detected for meeting ${meetingId}`);

            // Generate visualization from captured content
            const visual = await this.generateVisualization(
                meetingId,
                session.capturedContent,
                Array.from(session.capturedSpeakers),
                sourceWindowId
            );

            // Reset session
            session.isCapturing = false;
            session.capturedContent = [];
            session.capturedSpeakers = new Set();

            return { triggered: true, visual, status: 'completed' };
        }

        // Check for START trigger (only if not already capturing)
        if (!session.isCapturing && hasStart) {
            console.log(`[VisualizationTrigger] START detected for meeting ${meetingId}`);
            session.isCapturing = true;
            session.capturedContent = [];
            session.capturedSpeakers = new Set();
            session.startTime = new Date();
            session.startSourceId = sourceWindowId;

            return { triggered: false, visual: null, status: 'started' };
        }

        // If currently capturing, add new content
        if (session.isCapturing && newContent.trim()) {
            session.capturedContent.push(`[${speaker}]: ${newContent}`);
            session.capturedSpeakers.add(speaker);
            return { triggered: false, visual: null, status: 'capturing' };
        }

        return { triggered: false, visual: null, status: 'idle' };
    }

    /**
     * Check if text contains any start trigger
     */
    isStartTriggerInText(text) {
        const normalized = text.toLowerCase();
        // Check simple triggers
        if (this.SIMPLE_START_TRIGGERS.some(trigger => normalized.includes(trigger))) {
            return true;
        }
        // Check wake word + intent
        const hasWakeWord = this.WAKE_WORDS.some(wake => normalized.includes(wake));
        if (hasWakeWord) {
            return this.VISUALIZATION_INTENTS.some(intent => normalized.includes(intent));
        }
        return false;
    }

    /**
     * Check if text contains any stop trigger
     */
    isStopTriggerInText(text) {
        const normalized = text.toLowerCase();
        if (this.SIMPLE_STOP_TRIGGERS.some(trigger => normalized.includes(trigger))) {
            return true;
        }
        return this.NEURONOTES_STOP_TRIGGERS.some(trigger => normalized.includes(trigger));
    }

    /**
     * Extract content between start and stop triggers
     */
    extractContentBetweenTriggers(text) {
        const normalized = text.toLowerCase();

        // Find the start trigger position
        let startPos = -1;
        let startTriggerEnd = 0;

        for (const trigger of this.SIMPLE_START_TRIGGERS) {
            const pos = normalized.indexOf(trigger);
            if (pos !== -1 && (startPos === -1 || pos < startPos)) {
                startPos = pos;
                startTriggerEnd = pos + trigger.length;
            }
        }

        if (startPos === -1) return null;

        // Find the stop trigger position (after start)
        let stopPos = text.length;

        for (const trigger of this.SIMPLE_STOP_TRIGGERS) {
            const pos = normalized.indexOf(trigger, startTriggerEnd);
            if (pos !== -1 && pos < stopPos) {
                stopPos = pos;
            }
        }

        for (const trigger of this.NEURONOTES_STOP_TRIGGERS) {
            const pos = normalized.indexOf(trigger, startTriggerEnd);
            if (pos !== -1 && pos < stopPos) {
                stopPos = pos;
            }
        }

        // Extract content between triggers
        const content = text.substring(startTriggerEnd, stopPos).trim();

        // Clean up common artifacts
        return content
            .replace(/^\s*[.,]\s*/, '') // Remove leading punctuation
            .replace(/\s*[.,]\s*$/, '') // Remove trailing punctuation
            .trim();
    }

    /**
     * Generate a visualization from captured transcript content
     */
    async generateVisualization(meetingId, contentLines, speakers, sourceWindowId) {
        if (contentLines.length === 0) {
            console.log('[VisualizationTrigger] No content captured, skipping visualization');
            return null;
        }

        const capturedText = contentLines.join('\n');
        console.log(`[VisualizationTrigger] Generating visualization from ${contentLines.length} lines`);

        try {
            // Use LLM to analyze the captured content and determine chart type/data
            const visualSpec = await this.analyzeForVisualization(capturedText, speakers);

            if (!visualSpec) {
                console.log('[VisualizationTrigger] LLM returned no visualization spec');
                return null;
            }

            // Generate chart config using VisualEngine
            const chartConfig = VisualEngine.generateChart({
                text: visualSpec.title || 'Meeting Insight',
                context: visualSpec.context || 'custom',
                type: visualSpec.type || 'bar'
            });

            // Override with LLM-generated data if available
            const finalVisual = {
                ...chartConfig,
                title: visualSpec.title || chartConfig.title,
                description: visualSpec.description || chartConfig.description,
                type: visualSpec.type || chartConfig.type,
                data: visualSpec.data || chartConfig.data,
                sourceWindowId,
                triggerContent: capturedText.substring(0, 500), // Store first 500 chars for reference
                speakers: speakers
            };

            // Save to database
            const savedVisual = await createVisual(meetingId, finalVisual);
            console.log(`[VisualizationTrigger] Visual saved with ID: ${savedVisual._id || savedVisual.id}`);

            return savedVisual;
        } catch (error) {
            console.error('[VisualizationTrigger] Error generating visualization:', error);
            return null;
        }
    }

    /**
     * Use LLM to analyze transcript content and suggest visualization
     */
    async analyzeForVisualization(text, speakers) {
        const { GROK_API_KEY, DEMO_MODE } = require('../config/env');

        // If no API key or demo mode, return mock visualization
        if (!GROK_API_KEY || DEMO_MODE === 'true') {
            return this.mockAnalysis(text);
        }

        const prompt = `Analyze the following meeting transcript excerpt and suggest a data visualization.

### Transcript:
${text}

### Instructions:
1. Identify if there are any numbers, percentages, comparisons, or trends mentioned.
2. Suggest the most appropriate chart type: "bar", "line", "pie", or "timeline".
3. Extract data points and labels from the text.
4. Provide a title and description.

Return ONLY valid JSON in this format:
{
    "type": "bar|line|pie|timeline",
    "title": "Chart Title",
    "description": "What this chart shows",
    "context": "category like 'sales', 'performance', 'budget'",
    "data": {
        "labels": ["Label1", "Label2", ...],
        "values": [10, 20, ...]
    }
}

If no meaningful visualization can be derived, return:
{"type": null}`;

        try {
            const response = await LLMService._callGrok(prompt, true);
            if (response) {
                const cleanJson = response.replace(/```json/g, '').replace(/```/g, '').trim();
                const parsed = JSON.parse(cleanJson);

                if (parsed.type === null) {
                    return null;
                }
                return parsed;
            }
        } catch (e) {
            console.error('[VisualizationTrigger] LLM analysis failed:', e.message);
        }

        // Fallback to mock
        return this.mockAnalysis(text);
    }

    /**
     * Mock analysis for demo mode or when LLM fails
     */
    mockAnalysis(text) {
        const lowerText = text.toLowerCase();

        // Detect keywords to suggest chart type
        if (lowerText.includes('percent') || lowerText.includes('%') ||
            lowerText.includes('budget') || lowerText.includes('split') ||
            lowerText.includes('allocation')) {
            return {
                type: 'pie',
                title: 'Budget Allocation',
                description: 'Distribution based on discussion',
                context: 'budget',
                data: {
                    labels: ['Development', 'Marketing', 'Operations'],
                    values: [45, 35, 20]
                }
            };
        }

        if (lowerText.includes('growth') || lowerText.includes('trend') ||
            lowerText.includes('over time') || lowerText.includes('quarter')) {
            return {
                type: 'line',
                title: 'Growth Trend',
                description: 'Trend analysis from discussion',
                context: 'growth',
                data: {
                    labels: ['Q1', 'Q2', 'Q3', 'Q4'],
                    values: [20, 35, 45, 60]
                }
            };
        }

        if (lowerText.includes('compare') || lowerText.includes('vs') ||
            lowerText.includes('versus') || lowerText.includes('performance')) {
            return {
                type: 'bar',
                title: 'Performance Comparison',
                description: 'Comparative analysis',
                context: 'comparison',
                data: {
                    labels: ['Option A', 'Option B', 'Option C'],
                    values: [75, 90, 60]
                }
            };
        }

        // Default: timeline for discussions about tasks/milestones
        return {
            type: 'timeline',
            title: 'Discussion Summary',
            description: 'Key points from the conversation',
            context: 'summary',
            data: {
                labels: ['Point 1', 'Point 2', 'Point 3'],
                values: [80, 60, 40]
            }
        };
    }

    /**
     * Check if a meeting is currently in visualization capture mode
     */
    isCapturing(meetingId) {
        const session = this.sessions.get(meetingId);
        return session?.isCapturing || false;
    }

    /**
     * Force stop capturing for a meeting (e.g., when meeting ends)
     */
    stopCapturing(meetingId) {
        if (this.sessions.has(meetingId)) {
            this.sessions.delete(meetingId);
        }
    }

    /**
     * Get current capture status for debugging
     */
    getStatus(meetingId) {
        const session = this.sessions.get(meetingId);
        if (!session) return { status: 'no_session' };

        return {
            isCapturing: session.isCapturing,
            linesCaptured: session.capturedContent.length,
            speakers: Array.from(session.capturedSpeakers),
            startTime: session.startTime
        };
    }
}

module.exports = new VisualizationTriggerService();
