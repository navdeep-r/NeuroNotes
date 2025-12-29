const mongoose = require('mongoose');

const MinuteSchema = new mongoose.Schema({
    meetingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Meeting', required: true },
    minuteIndex: { type: Number, required: true },
    transcript: { type: String, required: true },
    speaker: { type: String, default: 'Unknown' },
    startTime: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now }
});

// Compound index for fast queries: finding minutes for a specific meeting in order
MinuteSchema.index({ meetingId: 1, minuteIndex: 1 });

module.exports = mongoose.model('Minute', MinuteSchema);
