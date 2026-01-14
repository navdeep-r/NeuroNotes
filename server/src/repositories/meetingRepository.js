const Meeting = require('../models/Meeting');

/**
 * Create a new meeting document
 */
async function createMeeting(meetingData) {
  const meeting = new Meeting({
    title: meetingData.title || 'Untitled Meeting',
    status: meetingData.status || 'scheduled',
    meetingLink: meetingData.meetingLink || '',
    startTime: meetingData.startTime || new Date(),
    participants: meetingData.participants || [],
    summary: meetingData.summary || {
      keyPoints: [],
      decisions: [],
      actionItems: []
    }
  });

  await meeting.save();
  return meeting.toObject();
}

/**
 * Get meeting by ID
 */
async function getMeetingById(meetingId) {
  try {
    const meeting = await Meeting.findById(meetingId);
    return meeting ? meeting.toObject() : null;
  } catch (err) {
    return null; // Invalid ID format etc
  }
}

/**
 * Get the most recent live meeting
 */
async function getLatestLiveMeeting() {
  return await Meeting.findOne({ status: 'live' })
    .sort({ createdAt: -1 });
}

/**
 * Get all meetings sorted by creation date (descending)
 */
async function getAllMeetings(limit = 50) {
  const meetings = await Meeting.find()
    .sort({ createdAt: -1 })
    .limit(limit);

  return meetings.map(m => m.toObject());
}

/**
 * Update meeting fields
 */
async function updateMeeting(meetingId, updates) {
  await Meeting.findByIdAndUpdate(meetingId, {
    ...updates,
    updatedAt: new Date()
  });
}

/**
 * Delete meeting by ID
 */
async function deleteMeeting(meetingId) {
  await Meeting.findByIdAndDelete(meetingId);
  // Optional: Delete associated minutes/visuals too
}

module.exports = {
  createMeeting,
  getMeetingById,
  getLatestLiveMeeting,
  getAllMeetings,
  updateMeeting,
  deleteMeeting,
};
