const express = require('express');
const router = express.Router();
const ingestController = require('../controllers/ingestController');

router.post('/chunk', ingestController.ingestChunk);
router.post('/webhook', ingestController.ingestWebhook); // For Transcriptonic extension
router.post('/simulation', ingestController.startSimulation);
router.post('/test-visualization', ingestController.testVisualization); // For testing

module.exports = router;
