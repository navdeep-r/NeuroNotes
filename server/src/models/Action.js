const mongoose = require('mongoose');

const ActionSchema = new mongoose.Schema({
    meetingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Meeting', required: true },
    content: { type: String, required: true },
    assignee: { type: String, default: 'Unassigned' },
    status: { type: String, enum: ['pending', 'in_progress', 'completed'], default: 'pending' },
    sourceWindowId: { type: String },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Action', ActionSchema);
