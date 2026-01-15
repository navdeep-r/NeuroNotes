const mongoose = require('mongoose');

const AutomationLogSchema = new mongoose.Schema({
    meetingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Meeting',
        required: true
    },
    triggerText: {
        type: String,
        required: true
    },
    intent: {
        type: String,
        required: true,
        enum: ['schedule_meeting', 'create_ticket', 'send_email', 'email_summary', 'create_visualization', 'other']
    },
    parameters: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    editedParameters: {
        type: mongoose.Schema.Types.Mixed,
        default: null
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'completed', 'failed'],
        default: 'pending'
    },
    confidenceScore: {
        type: Number,
        min: 0,
        max: 1,
        default: 0.5
    },
    externalId: {
        type: String,
        default: null
    },
    error: {
        type: String,
        default: null
    },
    approvedAt: {
        type: Date,
        default: null
    }
}, { timestamps: true });

module.exports = mongoose.model('AutomationLog', AutomationLogSchema);
