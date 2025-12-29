const mongoose = require('mongoose');

const DecisionSchema = new mongoose.Schema({
    meetingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Meeting', required: true },
    content: { type: String, required: true },
    confidence: { type: Number, default: 0 },
    sourceWindowId: { type: String },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Decision', DecisionSchema);
