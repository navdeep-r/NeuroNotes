const mongoose = require('mongoose');

const MinuteWindowSchema = new mongoose.Schema({
    meetingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Meeting',
        required: true
    },
    startTime: {
        type: Date,
        required: true
    },
    endTime: {
        type: Date,
        required: true
    },
    transcript: {
        type: String,
        default: ''
    },
    processed: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

// Index for efficient retrieval by meeting and time
MinuteWindowSchema.index({ meetingId: 1, startTime: 1 });

module.exports = mongoose.model('MinuteWindow', MinuteWindowSchema);
