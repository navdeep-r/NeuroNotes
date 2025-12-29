const express = require('express');
const router = express.Router();
const meetingController = require('../controllers/meetingController');

router.get('/', meetingController.getMeetings);
router.post('/', meetingController.createMeeting);
router.get('/:id', meetingController.getMeetingDetails);
router.get('/:id/artifacts', meetingController.getMeetingArtifacts);

module.exports = router;
