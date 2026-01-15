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

        // ---------------------------------------------------------
        // Action Execution Logic (Internal Limits / Side Effects)
        // ---------------------------------------------------------
        try {
            // Intent: Schedule Meeting -> Create internal "Scheduled" meeting
            if (logDoc.intent === 'schedule_meeting') {
                const params = (editedParameters && editedParameters.size > 0)
                    ? Object.fromEntries(editedParameters)
                    : (logDoc.parameters instanceof Map ? Object.fromEntries(logDoc.parameters) : logDoc.parameters);

                console.log('[AutomationService] Creating internal scheduled meeting for approval...');

                // Parse Start Time
                let startTime = new Date();
                if (params.date && params.time) {
                    const dateStr = params.date; // YYYY-MM-DD
                    const timeStr = params.time; // HH:MM AM/PM
                    // Simple parse attempt or use library if needed (assuming ISO-ish or simple format from LLM)
                    // For now, let's try constructing it. 
                    // Note: LLMService usually returns specific formats.
                    // If simple parse fails, fallback to 'next hour'.
                    const combined = new Date(`${dateStr} ${timeStr}`);
                    if (!isNaN(combined.getTime())) {
                        startTime = combined;
                    }
                }

                await require('../repositories/meetingRepository').createMeeting({
                    title: params.title || 'Scheduled Meeting',
                    startTime: startTime,
                    status: 'scheduled',
                    participants: params.attendees || [], // basic array of strings
                    meetingLink: 'https://meet.google.com/cbg-dbih-jjy', // Hardcoded per requirement
                    summary: { keyPoints: [], decisions: [], actionItems: [] }
                });
                console.log('[AutomationService] Internal meeting created.');
            }

            // Trigger n8n Webhook
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
            // Convert parameters from Mongoose Map to plain object
            const originalParams = logDoc.parameters instanceof Map 
                ? Object.fromEntries(logDoc.parameters) 
                : (logDoc.parameters || {});
            
            const editedParams = (logDoc.editedParameters && logDoc.editedParameters.size > 0)
                ? Object.fromEntries(logDoc.editedParameters)
                : {};

            // Merge: Prefer edited parameters if they exist
            let finalParams = { ...originalParams, ...editedParams };

            // Debug log the merged params
            console.log('[AutomationService] Merged params:', JSON.stringify(finalParams, null, 2));

            // For email_summary intent, pre-format recipients and body
            if (logDoc.intent === 'email_summary') {
                let recipientEmails = '';
                const recipients = finalParams.recipients;

                if (Array.isArray(recipients) && recipients.length > 0) {
                    recipientEmails = recipients
                        .map(r => (typeof r === 'object' && r.email) ? r.email : (typeof r === 'string' ? r : ''))
                        .filter(e => e && e.includes('@'))
                        .join(',');
                } else if (typeof recipients === 'string') {
                    recipientEmails = recipients;
                }

                if (!recipientEmails) {
                    throw new Error('No valid recipient emails found for summary delivery.');
                }

                // Generate a beautiful HTML Email Body
                const summary = finalParams.summary || {};
                const keyPointsHtml = (summary.keyPoints || []).map(kp => `<li>${kp}</li>`).join('');
                const decisionsHtml = (summary.decisions || []).map(d => `<li>${d.content || d}</li>`).join('');
                const actionsHtml = (summary.actionItems || []).map(a => `<li><b>${a.content}</b> (Assignee: ${a.assignee || 'Unassigned'})</li>`).join('');

                const emailBody = `
                    <div style="font-family: sans-serif; max-width: 600px; color: #333;">
                        <h2 style="color: #6366f1;">Meeting Summary: ${finalParams.meetingTitle || 'Untitled'}</h2>
                        <p>Hi there, here are the key takeaways from the meeting held on ${new Date(finalParams.meetingDate).toLocaleDateString()}.</p>
                        
                        ${keyPointsHtml ? `<h3>Key Points</h3><ul>${keyPointsHtml}</ul>` : ''}
                        ${decisionsHtml ? `<h3>Decisions Made</h3><ul>${decisionsHtml}</ul>` : ''}
                        ${actionsHtml ? `<h3>Action Items</h3><ul>${actionsHtml}</ul>` : ''}
                        
                        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                        <p style="font-size: 12px; color: #999;">Sent via MinuteFlow AI Intelligence</p>
                    </div>
                `;

                // Set these for easy access in n8n
                finalParams.recipientEmails = recipientEmails;
                finalParams.emailBody = emailBody;
                
                console.log(`[AutomationService] Generated email summary for: ${recipientEmails}`);
            }

            const payload = {
                automationId: logDoc._id,
                meetingId: logDoc.meetingId,
                intent: logDoc.intent,
                parameters: finalParams,
                // Add these to top level as well for easier n8n mapping
                recipientEmails: finalParams.recipientEmails,
                emailBody: finalParams.emailBody,
                trigger: {
                    text: logDoc.triggerText,
                    speaker: meta.speaker,
                    timestamp: meta.timestamp
                }
            };

            console.log('[AutomationService] Sending payload to n8n:', JSON.stringify(payload, null, 2));

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
