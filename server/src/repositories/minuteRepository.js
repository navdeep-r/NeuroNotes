const Minute = require('../models/Minute');

/**
 * Upsert a minute window
 */
async function upsertMinuteWindow(meetingId, data) {
  const filter = {};

  if (data.id || data._id) {
    filter._id = data.id || data._id;
  } else {
    // Calculate minute index from startTime if not provided
    const minuteIndex = data.minuteIndex !== undefined
      ? data.minuteIndex
      : Math.floor(new Date(data.startTime).getTime() / 60000);
    filter.meetingId = meetingId;
    filter.minuteIndex = minuteIndex;
    data.minuteIndex = minuteIndex;
  }

  const updated = await Minute.findOneAndUpdate(
    filter,
    {
      $set: {
        ...data,
        meetingId
      }
    },
    { upsert: true, new: true }
  );

  return updated.toObject();
}

/**
 * Get all minutes for a meeting
 */
async function getMinutesByMeeting(meetingId) {
  const minutes = await Minute.find({ meetingId })
    .sort({ minuteIndex: 1 });
  return minutes.map(m => m.toObject());
}

module.exports = {
  upsertMinuteWindow,
  getMinutesByMeeting,
};
