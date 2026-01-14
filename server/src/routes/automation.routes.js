const express = require('express');
const router = express.Router();
const AutomationService = require('../services/AutomationService');
const AutomationLog = require('../models/AutomationLog');

// Get all pending automations (for the sidebar notification/list)
router.get('/pending', async (req, res) => {
    try {
        const pending = await AutomationLog.find({ status: 'pending' })
            .populate('meetingId', 'title')
            .sort({ createdAt: -1 });
        res.json(pending);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Approve an automation
router.post('/:id/approve', async (req, res) => {
    try {
        const { editedParameters } = req.body;
        const result = await AutomationService.approveAutomation(req.params.id, editedParameters);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Reject an automation
router.post('/:id/reject', async (req, res) => {
    try {
        const result = await AutomationService.rejectAutomation(req.params.id);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
