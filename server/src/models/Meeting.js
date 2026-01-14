const mongoose = require('mongoose');

const MeetingSchema = new mongoose.Schema({
    title: { type: String, default: 'Untitled Meeting' },
    status: { type: String, enum: ['live', 'completed', 'scheduled'], default: 'scheduled' },
    meetingLink: { type: String },
    startTime: { type: Date, default: Date.now },
    endTime: { type: Date },
    participants: [String],
    // Post-Meeting Email Context
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace' },
    selectedRecipients: [{
        name: String,
        email: String
    }],
    summary: {
        keyPoints: [String],
        // Enhanced Summary Fields
        opportunities: [String],
        risks: [String],
        eligibility: [String],
        questions: [String],

        decisions: [{
            content: String,
            timestamp: Date,
            participants: [String]
        }],
        actionItems: [{
            content: String,
            assignee: String,
            dueDate: Date,
            status: { type: String, enum: ['pending', 'in_progress', 'completed'], default: 'pending' },
            createdAt: { type: Date, default: Date.now }
        }]
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Meeting', MeetingSchema);
