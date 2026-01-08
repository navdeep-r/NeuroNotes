const EventEmitter = require('events');
const { upsertMinuteWindow } = require('../repositories/minuteRepository');
const { batchCreateInsights } = require('../repositories/insightRepository');
const { createVisual } = require('../repositories/visualRepository');
const LLMService = require('./LLMService');
const VisualEngine = require('./VisualEngine');

class SimulationService extends EventEmitter {
    constructor() {
        super();
        this.active = false;
        this.script = [
            "Okay everyone, let's get started with the Q4 review.",
            "First off, I'm happy to report that sales have grown by 20% this quarter.",
            "That is great news, effectively doubling our initial projection.",
            "We decided to allocate more budget to the marketing team for Q1 next year.",
            "Action item for Sarah: please prepare the updated budget report by Friday.",
            "Also, we are seeing a 15% increase in user retention.",
            "Let's look at the customer satisfaction scores.",
            "We agreed that we need to improve our support response time.",
            "Action item: implement the new support ticketing system.",
            "That summarizes our key points. Thanks everyone."
        ];
        this.intervalId = null;
    }

    /**
     * Start simulation for a meeting
     * Writes directly to Firestore (no Socket.IO)
     * 
     * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
     * 
     * @param {string} meetingId - The meeting ID to simulate
     */
    startSimulation(meetingId) {
        if (this.active) return;
        this.active = true;
        let index = 0;

        console.log(`Starting simulation for meeting ${meetingId}`);

        this.intervalId = setInterval(async () => {
            if (index >= this.script.length) {
                this.stopSimulation();
                return;
            }

            const text = this.script[index];
            const now = new Date();
            const speaker = index % 2 === 0 ? 'Alice' : 'Bob';

            try {
                // Calculate minute window boundaries
                const windowStart = new Date(now);
                windowStart.setSeconds(0, 0);
                const windowEnd = new Date(windowStart);
                windowEnd.setMinutes(windowEnd.getMinutes() + 1);

                // 1. Write transcript to Firestore (Requirement 6.3)
                // Frontend real-time listeners will receive updates automatically
                // UPDATED: Send as segment to prevent overwrite of previous sentences in this minute
                const minuteWindow = await upsertMinuteWindow(meetingId, {
                    startTime: windowStart,
                    endTime: windowEnd,

                    // New segment structure
                    segment: {
                        speaker: speaker,
                        text: text,
                        timestamp: now
                    },

                    // Legacy field (will only contain latest sentence, but kept for schema compliance if needed)
                    transcript: text,
                    speaker: speaker,
                    processed: false,
                });

                // 2. Process for insights using mock LLM (Requirement 6.4, 6.6)
                const insights = await LLMService.processWindow(text);

                // 3. Write actions and decisions to Firestore using batch write
                if (insights.actions.length > 0 || insights.decisions.length > 0) {
                    const actionsWithSource = insights.actions.map(action => ({
                        ...action,
                        sourceWindowId: minuteWindow.id,
                    }));
                    const decisionsWithSource = insights.decisions.map(decision => ({
                        ...decision,
                        sourceWindowId: minuteWindow.id,
                    }));

                    await batchCreateInsights(meetingId, actionsWithSource, decisionsWithSource);
                }

                // 4. Write visuals to Firestore
                if (insights.visualCandidates.length > 0) {
                    for (const candidate of insights.visualCandidates) {
                        const chartConfig = VisualEngine.generateChart(candidate);
                        await createVisual(meetingId, {
                            ...chartConfig,
                            sourceWindowId: minuteWindow.id,
                        });
                    }
                }

                // Mark minute window as processed
                await upsertMinuteWindow(meetingId, {
                    id: minuteWindow.id,
                    processed: true,
                });

            } catch (error) {
                console.error(`[SimulationService] Error processing script entry ${index}:`, error.message);
                // Continue with next entry even if this one fails (Requirement 9.2)
            }

            index++;
        }, 3000); // New sentence every 3 seconds (Requirement 6.3)
    }

    stopSimulation() {
        if (this.intervalId) clearInterval(this.intervalId);
        this.active = false;
        console.log('Simulation stopped');
    }
}

module.exports = new SimulationService();
