const { getDb } = require('../config/firebase');
const { FieldValue } = require('firebase-admin/firestore');

const COLLECTION_NAME = 'meetings';

/**
 * Create a new meeting document
 * @param {Object} meetingData - Meeting data matching Meeting schema
 * @returns {Promise<{id: string, ...meetingData}>}
 */
async function createMeeting(meetingData) {
  const db = getDb();
  const now = FieldValue.serverTimestamp();
  
  const docData = {
    title: meetingData.title || 'Untitled Meeting',
    status: meetingData.status || 'scheduled',
    startTime: meetingData.startTime || now,
    endTime: meetingData.endTime || null,
    participants: meetingData.participants || [],
    summary: meetingData.summary || null,
    createdAt: now,
    updatedAt: now,
  };

  const docRef = await db.collection(COLLECTION_NAME).add(docData);
  
  // Fetch the created document to get server timestamps resolved
  const snapshot = await docRef.get();
  const data = snapshot.data();
  
  return {
    id: docRef.id,
    ...data,
  };
}

/**
 * Get meeting by ID
 * @param {string} meetingId
 * @returns {Promise<Object|null>}
 */
async function getMeetingById(meetingId) {
  const db = getDb();
  const docRef = db.collection(COLLECTION_NAME).doc(meetingId);
  const snapshot = await docRef.get();
  
  if (!snapshot.exists) {
    return null;
  }
  
  return {
    id: snapshot.id,
    ...snapshot.data(),
  };
}

/**
 * Get all meetings sorted by creation date (descending)
 * @param {number} limit - Maximum results (default 50)
 * @returns {Promise<Array>}
 */
async function getAllMeetings(limit = 50) {
  const db = getDb();
  const snapshot = await db
    .collection(COLLECTION_NAME)
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }));
}

/**
 * Update meeting fields
 * @param {string} meetingId
 * @param {Object} updates - Partial meeting data
 * @returns {Promise<void>}
 */
async function updateMeeting(meetingId, updates) {
  const db = getDb();
  const docRef = db.collection(COLLECTION_NAME).doc(meetingId);
  
  await docRef.update({
    ...updates,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

module.exports = {
  createMeeting,
  getMeetingById,
  getAllMeetings,
  updateMeeting,
};
