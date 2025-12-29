const mongoose = require('mongoose');

const ActionItemSchema = new mongoose.Schema({
    meetingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Meeting',
        required: true
    },
    content: {
        type: String,
        required: true
    },
    assignee: {
        type: String,
        default: 'Unassigned'
    },
    status: {
        type: String,
        enum: ['pending', 'in-progress', 'completed'],
        default: 'pending'
    },
    sourceWindowId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MinuteWindow'
    }
}, { timestamps: true });

const DecisionSchema = new mongoose.Schema({
    meetingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Meeting',
        required: true
    },
    content: {
        type: String,
        required: true
    },
    confidence: {
        type: Number,
        min: 0,
        max: 1
    },
    sourceWindowId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MinuteWindow'
    }
}, { timestamps: true });

module.exports = {
    ActionItem: mongoose.model('ActionItem', ActionItemSchema),
    Decision: mongoose.model('Decision', DecisionSchema)
};
