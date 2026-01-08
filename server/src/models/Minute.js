const mongoose = require('mongoose');

const MinuteSchema = new mongoose.Schema({
    meetingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Meeting', required: true },
    minuteIndex: { type: Number, required: true },

    // Check for segments first. If empty, fall back to legacy 'transcript' string.
    segments: [{
        speaker: String,
        text: String,
        timestamp: { type: Date, default: Date.now }
    }],

    // Legacy field - kept for backward compatibility with old data
    transcript: { type: String },

    startTime: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now }
});

// Compound index for fast queries: finding minutes for a specific meeting in order
MinuteSchema.index({ meetingId: 1, minuteIndex: 1 });

module.exports = mongoose.model('Minute', MinuteSchema);
