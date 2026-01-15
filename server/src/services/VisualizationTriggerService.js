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
     * Use LLM to deeply analyze transcript content and generate refined visualization spec
     * This is the core "Grok Deep Refinement" phase - no fallbacks allowed
     */
    async analyzeForVisualization(text, speakers) {
        const { GROK_API_KEY } = require('../config/env');

        if (!GROK_API_KEY) {
            console.error('[VisualizationTrigger] GROK_API_KEY not configured - cannot generate visualization');
            return null;
        }

        const prompt = `You are an expert data visualization analyst. Your job is to generate a PRECISE chart specification from the transcript below.

### Transcript:
${text}

### Speakers:
${speakers.join(', ')}

### INSTRUCTIONS:
1. **Analyze Content**: Identify what is being measured (metrics) and the relationship between data points.
2. **Extract Data**: Pull out EXACT numbers. Do not estimate.
3. **Select Chart Type (CRITICAL)**:
   - **Line Chart ("line")**: MUST be used for trends over time (e.g., "over Q1-Q4", "growth last year", "monthly revenue").
   - **Bar Chart ("bar")**: MUST be used for comparing distinct categories (e.g., "Revenue by Product", "Sales per Region", "Team Performance").
   - **Pie Chart ("pie")**: MUST be used for parts of a whole (e.g., "Budget Split", "Market Share", "percentages totaling 100%").
   - **Timeline ("timeline")**: Use for sequences of events or milestones.
   - **Radial ("radial")**: Use for progress towards a goal (0-100%).

4. **Generate Output**: Return valid JSON.

### REQUIRED JSON FORMAT:
{
    "type": "bar|line|pie|timeline|radial",
    "title": "Clear, Business-Focused Title",
    "description": "Short explanation of the insight.",
    "insight": "One specific key takeaway.",
    "data": {
        "labels": ["Label1", "Label2", ...],
        "values": [10, 20, ...], 
        "units": "$" or "%" or "users" or null
    },
    "confidence": 0.9
}

### EXAMPLES:
- "Sales grew from 10k in Jan to 15k in Feb" -> Type: "line", Labels: ["Jan", "Feb"], Values: [10000, 15000]
- "We spent 40% on Ads and 60% on Dev" -> Type: "pie", Labels: ["Ads", "Dev"], Values: [40, 60]
- "Team A made 50 calls, Team B made 30" -> Type: "bar", Labels: ["Team A", "Team B"], Values: [50, 30]

Return ONLY the JSON.`;

        try {
            console.log('[VisualizationTrigger] Sending to Grok for deep refinement...');
            const response = await LLMService._callGrok(prompt, true);

            if (!response || !response.trim()) {
                console.error('[VisualizationTrigger] Grok returned empty response');
                return null;
            }

            const cleanJson = response.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(cleanJson);

            // Validate Grok output
            if (parsed.type === null) {
                console.warn(`[VisualizationTrigger] Grok declined: ${parsed.reason || 'insufficient data'}`);
                return null;
            }

            // Validate required fields
            if (!parsed.data?.labels || !parsed.data?.values || parsed.data.labels.length < 2) {
                console.warn('[VisualizationTrigger] Grok output missing required data fields');
                return null;
            }

            // Validate confidence threshold
            if (parsed.confidence && parsed.confidence < 0.5) {
                console.warn(`[VisualizationTrigger] Low confidence (${parsed.confidence}), rejecting`);
                return null;
            }

            console.log(`[VisualizationTrigger] Grok refined successfully: ${parsed.title} (confidence: ${parsed.confidence})`);
            return parsed;

        } catch (e) {
            console.error('[VisualizationTrigger] Grok analysis failed:', e.message);
            return null; // No fallback - strict pipeline enforcement
        }
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
