const AutomationLog = require('../models/AutomationLog');
const { N8N_WEBHOOK_URL } = require('../config/env');

class AutomationService {
    constructor() {
        // Regex patterns for intent detection (Rule-based for now)
        this.intents = [
            {
                name: 'schedule_meeting',
                // Look for "schedule" followed loosely by "meeting/call" and time indicators
                // Matches: "Hey neuro, schedule a meeting for Friday", "Schedule a call at 5pm"
                patterns: [
                    /schedule\s+(?:a\s+)?(?:meeting|call|meet)\s+(?:for|on|at)?\s+(.+)/i,
                    /set\s+up\s+(?:a\s+)?(?:meeting|call)\s+(?:for|on|at)?\s+(.+)/i
                ]
            },
            {
                name: 'create_ticket',
                patterns: [
                    /create\s+(?:a\s+)?(?:ticket|issue|bug)\s+(?:for|about)?\s+(.+)/i
                ]
            }
        ];
    }

    /**
     * Process a transcript chunk to detect and trigger automations
     * @param {string} meetingId 
     * @param {object} chunkData { text, speaker, timestamp }
     */
    async processChunk(meetingId, chunkData) {
        const { text, speaker, timestamp } = chunkData;

        // 1. Detect Intent
        const detected = this.detectIntent(text);
        if (!detected) return null;

        console.log(`[AutomationService] Detected intent '${detected.intent}' from: "${text}"`);

        // 2. Extract Parameters
        const parameters = this.extractParameters(detected.intent, detected.match);

        // 3. Log to DB as 'pending'
        const log = new AutomationLog({
            meetingId,
            triggerText: text,
            intent: detected.intent,
            parameters,
            status: 'pending',
            confidenceScore: 0.95 // Mock high confidence for detection
        });
        await log.save();

        // 4. Return log for further manual approval
        console.log(`[AutomationService] Action pending review: ${log._id}`);
        return log;
    }

    async approveAutomation(id, editedParameters) {
        const logDoc = await AutomationLog.findById(id);
        if (!logDoc) throw new Error('Automation not found');

        logDoc.status = 'approved';
        logDoc.editedParameters = editedParameters;
        logDoc.approvedAt = new Date();
        await logDoc.save();

        // Trigger the actual execution
        try {
            // we pass editedParameters to n8n if available
            await this.triggerWebhook(logDoc, {
                speaker: 'User (Manual Approval)',
                timestamp: new Date()
            });
            logDoc.status = 'completed';
            await logDoc.save();
        } catch (err) {
            logDoc.status = 'failed';
            logDoc.error = err.message;
            await logDoc.save();
            throw err;
        }

        return logDoc;
    }

    async rejectAutomation(id) {
        const logDoc = await AutomationLog.findById(id);
        if (!logDoc) throw new Error('Automation not found');

        logDoc.status = 'rejected';
        logDoc.rejectedAt = new Date();
        await logDoc.save();

        return logDoc;
    }

    detectIntent(text) {
        // Simple iteration over regex patterns
        for (const intent of this.intents) {
            for (const pattern of intent.patterns) {
                const match = text.match(pattern);
                if (match) {
                    return { intent: intent.name, match: match };
                }
            }
        }
        return null;
    }

    extractParameters(intentName, match) {
        // Basic parameter extraction from the captured group
        const capturedText = match[1] || '';

        return {
            raw_time_context: capturedText.trim(),
            detected_at: new Date()
        };
    }

    async triggerWebhook(logDoc, meta) {
        if (!process.env.N8N_WEBHOOK_URL) {
            console.warn('[AutomationService] N8N_WEBHOOK_URL not set. Skipping trigger.');
            logDoc.status = 'failed';
            logDoc.error = 'N8N_WEBHOOK_URL not configured';
            await logDoc.save();
            return;
        }

        try {
            // Use edited parameters if they exist, otherwise original
            const paramsToUse = (logDoc.editedParameters && logDoc.editedParameters.size > 0)
                ? logDoc.editedParameters
                : logDoc.parameters;

            const finalParams = paramsToUse instanceof Map
                ? Object.fromEntries(paramsToUse)
                : (paramsToUse || {});

            const payload = {
                automationId: logDoc._id,
                meetingId: logDoc.meetingId,
                intent: logDoc.intent,
                parameters: finalParams,
                trigger: {
                    text: logDoc.triggerText,
                    speaker: meta.speaker,
                    timestamp: meta.timestamp
                }
            };

            const response = await fetch(process.env.N8N_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorBody = await response.text();
                console.error(`[AutomationService] n8n Error Response:`, errorBody);
                throw new Error(`Webhook failed with status ${response.status}`);
            }

            const data = await response.json().catch(() => ({}));

            logDoc.status = 'triggered';
            logDoc.externalId = data.id || data.executionId;
            await logDoc.save();

            console.log(`[AutomationService] Successfully triggered n8n for log ${logDoc._id}`);

        } catch (error) {
            logDoc.status = 'failed';
            logDoc.error = error.message;
            await logDoc.save();
            throw error;
        }
    }
}

module.exports = new AutomationService();
