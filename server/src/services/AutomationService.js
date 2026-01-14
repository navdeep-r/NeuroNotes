const AutomationLog = require('../models/AutomationLog');
const LLMService = require('./LLMService');

class AutomationService {
    constructor() {
        // Active command buffers per meeting
        this.buffers = new Map();

        // Processing locks to prevent race conditions during Grok calls
        this.isProcessing = new Set();

        // Intent keywords for scheduling (used as a fallback/pre-filter)
        this.schedulingKeywords = ['schedule', 'set up', 'create', 'book', 'plan'];

        // Filler words to strip before intent detection
        this.fillerWords = ['please', 'can', 'you', 'actually', 'just', 'um', 'uh', 'like'];
    }

    /**
     * Entry point for transcript chunks.
     * Implements strict "hey neuro ... over" framing.
     */
    async processChunk(meetingId, chunkData) {
        const { text } = chunkData;
        if (!text || typeof text !== 'string') return null;

        // 1. Detect "hey neuro" (case-insensitive, allows punctuation/fillers between hey and neuro)
        // Regex allows: "hey neuro", "hey, neuro", "hey... neuro", "hey neuro!"
        const startTrigger = /hey[\s,.\-!]*neuro/i;
        const startMatch = text.match(startTrigger);

        let activeBuffer = this.buffers.get(meetingId) || null;

        if (startMatch) {
            // Start a new command block from "hey neuro"
            const startIndex = startMatch.index;
            activeBuffer = text.substring(startIndex);
            this.buffers.set(meetingId, activeBuffer);
            console.log(`[AutomationService] Match started for ${meetingId}: "${activeBuffer}"`);
        } else if (activeBuffer) {
            // Continue existing block
            activeBuffer += " " + text;
            this.buffers.set(meetingId, activeBuffer);
        } else {
            // Not in a command block, ignore
            return null;
        }

        // 2. Detect "over" (case-insensitive) as the explicit end marker
        const endTrigger = /over/i;
        const endMatch = activeBuffer.match(endTrigger);

        if (endMatch) {
            // Extract the final block between "hey neuro" and "over"
            const rawBlock = activeBuffer.substring(0, endMatch.index).trim();
            this.buffers.delete(meetingId); // Unlock buffer

            console.log(`[AutomationService] Full command block extracted: "${rawBlock}"`);
            return await this.handleCommand(meetingId, rawBlock, text);
        }

        return null;
    }

    /**
     * Normalizes and classifies the extracted command block.
     */
    async handleCommand(meetingId, rawCommand, originalSnippet) {
        // 1. Normalization
        // Remove the start trigger itself, punctuation, filler words, and standardize whitespace
        let normalized = rawCommand.toLowerCase()
            .replace(/hey[\s,.\-!]*neuro/i, '')
            .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "")
            .split(/\s+/)
            .filter(word => !this.fillerWords.includes(word))
            .join(' ')
            .trim();

        console.log(`[AutomationService] Normalized: "${normalized}"`);

        // 2. Initial Intent Classification (Heuristic check before Grok)
        const hasSchedulingIntent = this.schedulingKeywords.some(kw => normalized.includes(kw));

        if (!hasSchedulingIntent) {
            console.log(`[AutomationService] No scheduling intent detected in block.`);
            return null;
        }

        // 3. Idempotency Check (Single "schedule_meeting" per meeting)
        // Key: meetingId + intent
        const intentType = 'schedule_meeting';
        const lockKey = `${meetingId}_${intentType}`;

        if (this.isProcessing.has(lockKey)) {
            console.warn(`[AutomationService] Already processing ${intentType} for ${meetingId}. Ignoring duplicate.`);
            return null;
        }

        // Check DB for existing non-rejected action
        const existing = await AutomationLog.findOne({
            meetingId,
            intent: intentType,
            status: { $nin: ['rejected', 'failed', 'dismissed'] }
        });

        if (existing) {
            console.log(`[AutomationService] Idempotency Hit: Action already exists for ${meetingId}. Skipping.`);
            // Note: If we wanted to update the confidence or params, we could do it here, 
            // but the user's latest prompt says "Do not create a new action" and 
            // "executed only once". We'll stick to strict idempotency.
            return existing;
        }

        // 4. Grok Refinement
        this.isProcessing.add(lockKey);
        try {
            console.log(`[AutomationService] Sending to Grok for precision refinement...`);
            const refined = await LLMService.refineCommand(normalized);

            if (refined.confidence < 0.4) {
                console.warn(`[AutomationService] Low confidence from Grok (${refined.confidence}). Skipping action creation.`);
                return null;
            }

            // 5. Create Pending Action
            const log = new AutomationLog({
                meetingId,
                triggerText: originalSnippet,
                intent: intentType,
                parameters: {
                    ...refined,
                    raw_command: normalized,
                    detected_at: new Date()
                },
                status: 'pending',
                confidenceScore: refined.confidence || 0.8
            });

            await log.save();
            console.log(`[AutomationService] Action created successfully: ${log._id}`);
            return log;

        } catch (err) {
            console.error(`[AutomationService] Error during Grok refinement:`, err);
            return null;
        } finally {
            this.isProcessing.delete(lockKey);
        }
    }

    /**
     * Approve and trigger the automation workflow (via n8n)
     */
    async approveAutomation(id, editedParameters) {
        const logDoc = await AutomationLog.findById(id);
        if (!logDoc) throw new Error('Automation not found');

        logDoc.status = 'approved';
        logDoc.editedParameters = editedParameters;
        logDoc.approvedAt = new Date();
        await logDoc.save();

        try {
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

    async triggerWebhook(logDoc, meta) {
        if (!process.env.N8N_WEBHOOK_URL) {
            console.warn('[AutomationService] N8N_WEBHOOK_URL not set. Skipping.');
            return;
        }

        try {
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
                const error = await response.text();
                throw new Error(`n8n Error: ${response.status} - ${error}`);
            }

            const data = await response.json().catch(() => ({}));
            logDoc.status = 'triggered';
            logDoc.externalId = data.id || data.executionId;
            await logDoc.save();

        } catch (error) {
            console.error(`[AutomationService] Webhook Trigger Failed:`, error);
            throw error;
        }
    }
}

module.exports = new AutomationService();
