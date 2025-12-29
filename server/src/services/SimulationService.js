const EventEmitter = require('events');
const { ActionItem, Decision, VisualArtifact } = require('../models/Insight');
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

    startSimulation(meetingId, io) {
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

            // 1. Emit transcript update
            io.to(meetingId).emit('transcript_update', {
                text: text,
                timestamp: new Date(),
                speaker: index % 2 === 0 ? 'Alice' : 'Bob'
            });

            // 2. Process for insights (Mock LLM)
            const insights = await LLMService.processWindow(text);

            // 3. Emit/Save Actions
            if (insights.actions.length > 0) {
                insights.actions.forEach(async (action) => {
                    const newAction = new ActionItem({ ...action, meetingId });
                    await newAction.save(); // In real app, might want to batch or await
                    io.to(meetingId).emit('insight_generated', { type: 'action_item', data: newAction });
                });
            }

            // 4. Emit/Save Decisions
            if (insights.decisions.length > 0) {
                insights.decisions.forEach(async (decision) => {
                    const newDecision = new Decision({ ...decision, meetingId });
                    await newDecision.save();
                    io.to(meetingId).emit('insight_generated', { type: 'decision', data: newDecision });
                });
            }

            // 5. Visuals
            if (insights.visualCandidates.length > 0) {
                insights.visualCandidates.forEach(async (cand) => {
                    const chartConfig = VisualEngine.generateChart(cand);
                    const newVisual = new VisualArtifact({ ...chartConfig, meetingId });
                    await newVisual.save();
                    io.to(meetingId).emit('visual_created', newVisual);
                });
            }

            index++;
        }, 3000); // New sentence every 3 seconds
    }

    stopSimulation() {
        if (this.intervalId) clearInterval(this.intervalId);
        this.active = false;
        console.log('Simulation stopped');
    }
}

module.exports = new SimulationService();
