const mongoose = require('mongoose');

const MeetingSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        default: 'Untitled Meeting'
    },
    status: {
        type: String,
        enum: ['live', 'completed', 'scheduled'],
        default: 'live'
    },
    startTime: {
        type: Date,
        default: Date.now
    },
    endTime: {
        type: Date
    },
    participants: [{
        type: String // Names or IDs
    }],
    summary: {
        type: String
    }
}, { timestamps: true });

module.exports = mongoose.model('Meeting', MeetingSchema);
