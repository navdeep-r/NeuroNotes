const mongoose = require('mongoose');

const VisualArtifactSchema = new mongoose.Schema({
    meetingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Meeting',
        required: true
    },
    type: {
        type: String,
        enum: ['bar', 'line', 'pie', 'generic'], // Expand as needed
        required: true
    },
    title: {
        type: String,
        required: true
    },
    description: {
        type: String
    },
    data: {
        type: mongoose.Schema.Types.Mixed, // Flexible JSON for chart data
        required: true
    },
    sourceWindowId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MinuteWindow'
    }
}, { timestamps: true });

module.exports = mongoose.model('VisualArtifact', VisualArtifactSchema);
