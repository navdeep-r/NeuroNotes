const { createMeeting, getMeetingById, getAllMeetings, deleteMeeting, updateMeeting } = require('../repositories/meetingRepository');
const { getMinutesByMeeting } = require('../repositories/minuteRepository');
const { getArtifactsByMeeting } = require('../repositories/insightRepository');
const { getVisualsByMeeting } = require('../repositories/visualRepository');
const { transformMeeting, transformAction, transformDecision, transformVisual } = require('../utils/transformers');
const SimulationService = require('../services/SimulationService');
const LLMService = require('../services/LLMService');
const AutomationLog = require('../models/AutomationLog');
const Workspace = require('../models/Workspace');

// Default query limit to prevent unbounded reads (Requirement 10.4)
const DEFAULT_LIMIT = 50;

/**
 * GET /api/meetings
 * 
 * Returns all meetings sorted by createdAt descending.
 * 
 * Requirements: 7.1, 7.5, 10.4
 */
exports.getMeetings = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || DEFAULT_LIMIT;

        // Get meetings from Firestore (already sorted by createdAt desc)
        const meetings = await getAllMeetings(limit);

        // Transform to frontend format (Requirement 8.1)
        const transformedMeetings = meetings.map(meeting => transformMeeting(meeting));

        res.json(transformedMeetings);
    } catch (err) {
        console.error('[getMeetings]', err.message);
        res.status(500).json({ error: 'Failed to retrieve meetings' });
    }
};

/**
 * GET /api/meetings/:id
 * 
 * Returns a single meeting by ID.
 * 
 * Requirements: 7.2, 7.4, 7.5
 */
exports.getMeetingDetails = async (req, res) => {
    try {
        const meeting = await getMeetingById(req.params.id);

        // Return 404 if meeting not found (Requirement 7.4)
        if (!meeting) {
            return res.status(404).json({ error: 'Meeting not found' });
        }

        // Transform to frontend format (Requirement 8.1)
        res.json(transformMeeting(meeting));
    } catch (err) {
        console.error('[getMeetingDetails]', err.message);
        res.status(500).json({ error: 'Failed to retrieve meeting' });
    }
};

/**
 * GET /api/meetings/:id/artifacts
 * 
 * Returns all actions, decisions, and visuals for a meeting.
 * 
 * Requirements: 7.3, 7.4, 7.5
 */
exports.getMeetingArtifacts = async (req, res) => {
    try {
        const { id } = req.params;

        // Verify meeting exists (Requirement 7.4)
        const meeting = await getMeetingById(id);
        if (!meeting) {
            return res.status(404).json({ error: 'Meeting not found' });
        }

        // Get artifacts from Firestore
        const { actions, decisions } = await getArtifactsByMeeting(id);
        const visuals = await getVisualsByMeeting(id);

        // Transform to frontend format (Requirements 8.2, 8.3, 8.4)
        res.json({
            actions: actions.map(action => transformAction(action)),
            decisions: decisions.map(decision => transformDecision(decision)),
            visuals: visuals.map(visual => transformVisual(visual)),
        });
    } catch (err) {
        console.error('[getMeetingArtifacts]', err.message);
        res.status(500).json({ error: 'Failed to retrieve artifacts' });
    }
};

/**
 * GET /api/meetings/:id/transcript
 * 
 * Returns full transcript for a meeting.
 */
exports.getMeetingTranscript = async (req, res) => {
    try {
        const { id } = req.params;
        const minutes = await getMinutesByMeeting(id);
        console.log(`[Transcript] Fetched ${minutes.length} chunks for meeting ${id}`);

        // Transform minute windows into transcript entries
        const transcript = minutes.flatMap(m => {
            if (m.segments && m.segments.length > 0) {
                return m.segments.map((seg, idx) => ({
                    id: seg._id || `${m._id}_${idx}`,
                    speaker: { name: seg.speaker, id: 'unknown', initials: seg.speaker?.[0] || '?', color: '#ccc' },
                    content: seg.text,
                    timestamp: seg.timestamp ? (seg.timestamp.toDate ? seg.timestamp.toDate() : new Date(seg.timestamp)) : new Date(),
                }));
            }
            // Fallback for legacy data
            return [{
                id: m.id,
                speaker: { name: m.speaker, id: 'unknown', initials: m.speaker?.[0] || '?', color: '#ccc' },
                content: m.transcript,
                timestamp: m.startTime.toDate ? m.startTime.toDate() : new Date(m.startTime._seconds * 1000),
            }];
        });

        res.json(transcript);
    } catch (err) {
        console.error('[getMeetingTranscript]', err.message);
        res.status(500).json({ error: 'Failed to retrieve transcript' });
    }
};

/**
 * POST /api/meetings
 * 
 * Creates a new meeting.
 */
exports.createMeeting = async (req, res) => {
    try {
        const { title, participants, status, startTime, meetingLink, workspaceId, selectedRecipients } = req.body;
        const meeting = await createMeeting({
            title: title || 'New Meeting',
            participants: participants || [],
            status: status || 'live',
            startTime: startTime ? new Date(startTime) : new Date(),
            meetingLink: meetingLink || '',
            workspaceId: workspaceId || null,
            selectedRecipients: selectedRecipients || []
        });
        res.status(201).json(transformMeeting(meeting));
    } catch (err) {
        console.error('[createMeeting]', err.message);
        res.status(500).json({ error: 'Failed to create meeting' });
    }
};

/**
 * DELETE /api/meetings/:id
 */
exports.deleteMeeting = async (req, res) => {
    try {
        await deleteMeeting(req.params.id);
        res.status(200).json({ success: true, message: 'Meeting deleted' });
    } catch (err) {
        console.error('Error deleting meeting:', err);
        res.status(500).json({ error: 'Failed to delete meeting' });
    }
};
/**
 * POST /api/meetings/:id/end
 */
exports.endMeeting = async (req, res) => {
    try {
        const { id } = req.params;

        // Check if meeting exists first
        const existingMeeting = await getMeetingById(id);
        if (!existingMeeting) {
            return res.status(404).json({ error: 'Meeting not found' });
        }

        // Update meeting status to completed
        await updateMeeting(id, {
            status: 'completed',
            endTime: new Date()
        });

        // Stop simulation if it was running for this meeting
        SimulationService.stopSimulation();

        // ---------------------------------------------------------
        // Post-Meeting Automation: Generate Summary & Prepare Email
        // ---------------------------------------------------------
        const meeting = await getMeetingById(id);

        // Resolve recipients (Fallback to Workspace members if empty)
        let recipients = (meeting && meeting.selectedRecipients) ? meeting.selectedRecipients : [];

        if (recipients.length === 0 && meeting && meeting.workspaceId) {
            try {
                const workspace = await Workspace.findById(meeting.workspaceId);
                if (workspace && workspace.members && workspace.members.length > 0) {
                    console.log(`[endMeeting] Using workspace members as recipients: ${workspace.members.length}`);
                    recipients = workspace.members.map(m => ({
                        name: m.name,
                        email: m.email
                    }));
                }
            } catch (err) {
                console.error('[endMeeting] Failed to fetch workspace members:', err);
            }
        }

        if (recipients.length > 0) {
            console.log(`[endMeeting] Found ${recipients.length} recipients. Generating summary...`);

            // 1. Fetch Transcript
            const minutes = await getMinutesByMeeting(id);
            const fullTranscript = minutes.flatMap(m => {
                if (m.segments && m.segments.length > 0) {
                    return m.segments.map(s => `[${s.speaker}]: ${s.text}`);
                }
                return m.transcript ? [`[${m.speaker || 'Unknown'}]: ${m.transcript}`] : [];
            }).join('\n');

            if (fullTranscript && fullTranscript.length > 50) {
                // 2. Generate Summary via LLM
                const summaryData = await LLMService.generateSummary(fullTranscript);

                // 3. Update Meeting with Summary
                await updateMeeting(id, {
                    summary: {
                        keyPoints: summaryData.keyPoints || [],
                        decisions: summaryData.decisions || [],
                        actionItems: summaryData.actionItems || [],
                        opportunities: summaryData.opportunities || [],
                        risks: summaryData.risks || [],
                        eligibility: summaryData.eligibility || [],
                        questions: summaryData.questions || []
                    }
                });

                // 4. Create Pending "Email Summary" Automation
                await AutomationLog.create({
                    meetingId: id,
                    triggerText: 'Meeting Ended (Auto-Trigger)',
                    intent: 'email_summary',
                    status: 'pending',
                    parameters: {
                        recipients: recipients,
                        summary: summaryData,
                        meetingTitle: meeting.title,
                        meetingDate: meeting.startTime,
                        workspaceId: meeting.workspaceId
                    }
                });

                console.log(`[endMeeting] Created pending email_summary automation for meeting ${id}`);
            } else {
                console.warn('[endMeeting] Transcript too short for summary/email automation.');
            }
        }

        res.status(200).json({ success: true, message: 'Meeting ended and processing initiated' });
    } catch (err) {
        console.error('[endMeeting]', err.message);
        res.status(500).json({ error: 'Failed to end meeting' });
    }
};

/**
 * POST /api/meetings/:id/generate-summary
 * 
 * Generates a full summary for the meeting using LLM.
 */
exports.generateMeetingSummary = async (req, res) => {
    try {
        const { id } = req.params;

        // 1. Fetch transcript
        const minutes = await getMinutesByMeeting(id);
        console.log(`[GenerateSummary] Fetched ${minutes.length} minutes for meeting ${id}`);

        const fullTranscript = minutes.flatMap(m => {
            // Debug log for first few minutes
            if (minutes.length < 5 || m.minuteIndex < 2) {
                console.log(`[GenerateSummary] Minute ${m.minuteIndex}: segments=${m.segments?.length}, legacy=${!!m.transcript}`);
            }

            if (m.segments && m.segments.length > 0) {
                return m.segments.map(s => `[${s.speaker}]: ${s.text}`);
            }
            // Handle case where legacy transcript might be undefined
            const legacyText = m.transcript || '';
            if (!legacyText) return [];
            return [`[${m.speaker || 'Unknown'}]: ${legacyText}`];
        }).join('\n');

        console.log(`[GenerateSummary] Full transcript length: ${fullTranscript.length}`);

        if (!fullTranscript || fullTranscript.length < 10) {
            console.warn('[GenerateSummary] Transcript too short or empty');
            return res.status(400).json({ error: 'No transcript available to summarize' });
        }

        // 2. Generate Summary via LLM
        const summaryData = await LLMService.generateSummary(fullTranscript);

        // 3. Update Meeting with Summary (Key Points)
        // We'll store keyPoints in the meeting doc for quick access, 
        // and actions/decisions in their own collections via repositories if we want to be strict,
        // but for now let's save keyPoints to meeting doc.

        await updateMeeting(id, {
            summary: {
                keyPoints: summaryData.keyPoints || [],
                decisions: summaryData.decisions || [],
                actionItems: summaryData.actionItems || [],
                // Enhanced fields
                opportunities: summaryData.opportunities || [],
                risks: summaryData.risks || [],
                eligibility: summaryData.eligibility || [],
                questions: summaryData.questions || []
            }
        });

        // 4. Return the fresh summary
        res.json({
            keyPoints: summaryData.keyPoints,
            decisions: summaryData.decisions,
            actionItems: summaryData.actionItems,
            opportunities: summaryData.opportunities,
            risks: summaryData.risks,
            eligibility: summaryData.eligibility,
            questions: summaryData.questions
        });

    } catch (err) {
        console.error('[generateMeetingSummary]', err.message);
        res.status(500).json({ error: 'Failed to generate summary' });
    }
};
