const mongoose = require('mongoose');

const WorkspaceSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    members: [{
        name: { type: String, trim: true },
        email: { type: String, required: true, trim: true }
    }],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Workspace', WorkspaceSchema);
