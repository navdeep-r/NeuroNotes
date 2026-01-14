const mongoose = require('mongoose');

const AutomationLogSchema = new mongoose.Schema({
    meetingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Meeting', required: true },

    // The raw text that triggered the automation
    triggerText: { type: String, required: true },

    // The detected intent (e.g., 'schedule_meeting')
    intent: { type: String, required: true },

    // Extracted parameters (date, time, attendees, etc.)
    parameters: { type: Map, of: mongoose.Schema.Types.Mixed }, // Flexible for different intents

    // Status of the automation
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'triggered', 'failed', 'completed', 'dismissed'],
        default: 'pending'
    },

    approvedAt: { type: Date },
    rejectedAt: { type: Date },
    confidenceScore: { type: Number, default: 1.0 },
    editedParameters: { type: Map, of: mongoose.Schema.Types.Mixed },

    // Response or ID from the external system (n8n)
    externalId: { type: String },

    // Any error message triggers
    error: { type: String },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

AutomationLogSchema.index({ meetingId: 1, createdAt: -1 });

module.exports = mongoose.model('AutomationLog', AutomationLogSchema);
