const { getDb } = require('../config/firebase');
const { FieldValue } = require('firebase-admin/firestore');

const MEETINGS_COLLECTION = 'meetings';
const MINUTES_SUBCOLLECTION = 'minutes';

/**
 * Get the minutes subcollection reference for a meeting
 * @param {string} meetingId
 * @returns {FirebaseFirestore.CollectionReference}
 */
function getMinutesCollection(meetingId) {
  const db = getDb();
  return db.collection(MEETINGS_COLLECTION).doc(meetingId).collection(MINUTES_SUBCOLLECTION);
}

/**
 * Create or update a minute window
 * @param {string} meetingId
 * @param {Object} minuteData
 * @returns {Promise<{id: string, ...minuteData}>}
 */
async function upsertMinuteWindow(meetingId, minuteData) {
  const minutesRef = getMinutesCollection(meetingId);
  const now = FieldValue.serverTimestamp();
  
  // If minuteId is provided, update existing; otherwise create new
  if (minuteData.id) {
    const docRef = minutesRef.doc(minuteData.id);
    const { id, ...dataWithoutId } = minuteData;
    
    await docRef.set({
      ...dataWithoutId,
      updatedAt: now,
    }, { merge: true });
    
    const snapshot = await docRef.get();
    return {
      id: snapshot.id,
      ...snapshot.data(),
    };
  }
  
  const docData = {
    startTime: minuteData.startTime,
    endTime: minuteData.endTime,
    transcript: minuteData.transcript || '',
    speaker: minuteData.speaker || '',
    processed: minuteData.processed || false,
    createdAt: now,
    updatedAt: now,
  };
  
  const docRef = await minutesRef.add(docData);
  const snapshot = await docRef.get();
  
  return {
    id: docRef.id,
    ...snapshot.data(),
  };
}

/**
 * Append transcript text to existing minute window
 * @param {string} meetingId
 * @param {string} minuteId
 * @param {string} text
 * @returns {Promise<void>}
 */
async function appendTranscript(meetingId, minuteId, text) {
  const db = getDb();
  const docRef = db
    .collection(MEETINGS_COLLECTION)
    .doc(meetingId)
    .collection(MINUTES_SUBCOLLECTION)
    .doc(minuteId);
  
  // Get current transcript and append
  const snapshot = await docRef.get();
  if (!snapshot.exists) {
    throw new Error(`Minute window ${minuteId} not found in meeting ${meetingId}`);
  }
  
  const currentTranscript = snapshot.data().transcript || '';
  const newTranscript = currentTranscript ? `${currentTranscript} ${text}` : text;
  
  await docRef.update({
    transcript: newTranscript,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

/**
 * Get all minute windows for a meeting
 * @param {string} meetingId
 * @returns {Promise<Array>}
 */
async function getMinutesByMeeting(meetingId) {
  const minutesRef = getMinutesCollection(meetingId);
  const snapshot = await minutesRef.orderBy('startTime', 'asc').get();
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }));
}

module.exports = {
  upsertMinuteWindow,
  appendTranscript,
  getMinutesByMeeting,
};
