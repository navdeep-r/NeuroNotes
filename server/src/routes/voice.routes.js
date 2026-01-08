const express = require('express');
const router = express.Router();
const voiceController = require('../controllers/voiceController');

// POST /api/voice/interact
router.post('/interact', voiceController.handleVoiceInteraction);

module.exports = router;
