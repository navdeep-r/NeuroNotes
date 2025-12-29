const Visual = require('../models/Visual');

/**
 * Create visual artifact
 */
async function createVisual(meetingId, visualData) {
  const visual = new Visual({
    meetingId,
    title: visualData.title,
    description: visualData.description,
    type: visualData.type,
    data: visualData.data
  });
  await visual.save();
  return visual.toObject();
}

/**
 * Get all visuals for a meeting
 */
async function getVisualsByMeeting(meetingId) {
  const visuals = await Visual.find({ meetingId });
  return visuals.map(v => v.toObject());
}

module.exports = {
  createVisual,
  getVisualsByMeeting,
};
