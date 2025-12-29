const express = require('express');
const router = express.Router();
const meetingController = require('../controllers/meetingController');

router.get('/', meetingController.getMeetings);
router.post('/', meetingController.createMeeting);
router.get('/:id', meetingController.getMeetingDetails);
router.get('/:id/transcript', meetingController.getMeetingTranscript);
router.get('/:id/artifacts', meetingController.getMeetingArtifacts);
router.post('/:id/end', meetingController.endMeeting);
router.delete('/:id', meetingController.deleteMeeting);

module.exports = router;
