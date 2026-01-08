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

  // Separate push (segments) and set (metadata) operations
  const updateOp = {};
  const { segment, ...rest } = data;

  if (segment) {
    updateOp.$push = { segments: segment };
  }

  // Use $set for other fields (meetingId is always required)
  updateOp.$set = {
    ...rest,
    meetingId
  };

  // If this is a new document (upsert), we might want to initialize fields, 
  // but $set combined with upsert works fine.

  const updated = await Minute.findOneAndUpdate(
    filter,
    updateOp,
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
