const mongoose = require('mongoose');

const VisualSchema = new mongoose.Schema({
    meetingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Meeting', required: true },
    title: { type: String, required: true },
    description: { type: String },
    type: { type: String, enum: ['line', 'bar', 'timeline', 'pie'], required: true },
    data: {
        labels: [String],
        values: [Number]
    },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Visual', VisualSchema);
