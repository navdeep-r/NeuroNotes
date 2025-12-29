const { getDb } = require('../config/firebase');
const { FieldValue } = require('firebase-admin/firestore');

const MEETINGS_COLLECTION = 'meetings';
const VISUALS_SUBCOLLECTION = 'visuals';

/**
 * Create visual artifact
 * @param {string} meetingId
 * @param {Object} visualData
 * @returns {Promise<{id: string, ...visualData}>}
 */
async function createVisual(meetingId, visualData) {
  const db = getDb();
  const now = FieldValue.serverTimestamp();
  
  const docData = {
    type: visualData.type || 'generic',
    title: visualData.title,
    description: visualData.description || '',
    data: visualData.data || { labels: [], datasets: [] },
    sourceWindowId: visualData.sourceWindowId || null,
    createdAt: now,
    updatedAt: now,
  };
  
  const visualsRef = db
    .collection(MEETINGS_COLLECTION)
    .doc(meetingId)
    .collection(VISUALS_SUBCOLLECTION);
  
  const docRef = await visualsRef.add(docData);
  const snapshot = await docRef.get();
  
  return {
    id: docRef.id,
    ...snapshot.data(),
  };
}

/**
 * Get all visuals for a meeting
 * @param {string} meetingId
 * @returns {Promise<Array>}
 */
async function getVisualsByMeeting(meetingId) {
  const db = getDb();
  const visualsRef = db
    .collection(MEETINGS_COLLECTION)
    .doc(meetingId)
    .collection(VISUALS_SUBCOLLECTION);
  
  const snapshot = await visualsRef.orderBy('createdAt', 'asc').get();
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }));
}

module.exports = {
  createVisual,
  getVisualsByMeeting,
};
