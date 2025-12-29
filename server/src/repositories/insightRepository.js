const { getDb } = require('../config/firebase');
const { FieldValue } = require('firebase-admin/firestore');

const MEETINGS_COLLECTION = 'meetings';
const ACTIONS_SUBCOLLECTION = 'actions';
const DECISIONS_SUBCOLLECTION = 'decisions';

/**
 * Create action item
 * @param {string} meetingId
 * @param {Object} actionData
 * @returns {Promise<{id: string, ...actionData}>}
 */
async function createAction(meetingId, actionData) {
  const db = getDb();
  const now = FieldValue.serverTimestamp();
  
  const docData = {
    content: actionData.content,
    assignee: actionData.assignee || 'Unassigned',
    status: actionData.status || 'pending',
    sourceWindowId: actionData.sourceWindowId || null,
    createdAt: now,
    updatedAt: now,
  };
  
  const actionsRef = db
    .collection(MEETINGS_COLLECTION)
    .doc(meetingId)
    .collection(ACTIONS_SUBCOLLECTION);
  
  const docRef = await actionsRef.add(docData);
  const snapshot = await docRef.get();
  
  return {
    id: docRef.id,
    ...snapshot.data(),
  };
}

/**
 * Create decision
 * @param {string} meetingId
 * @param {Object} decisionData
 * @returns {Promise<{id: string, ...decisionData}>}
 */
async function createDecision(meetingId, decisionData) {
  const db = getDb();
  const now = FieldValue.serverTimestamp();
  
  const docData = {
    content: decisionData.content,
    confidence: decisionData.confidence || 0,
    sourceWindowId: decisionData.sourceWindowId || null,
    createdAt: now,
    updatedAt: now,
  };
  
  const decisionsRef = db
    .collection(MEETINGS_COLLECTION)
    .doc(meetingId)
    .collection(DECISIONS_SUBCOLLECTION);
  
  const docRef = await decisionsRef.add(docData);
  const snapshot = await docRef.get();
  
  return {
    id: docRef.id,
    ...snapshot.data(),
  };
}

/**
 * Batch create multiple insights (actions and decisions)
 * Uses Firestore batch writes for cost optimization
 * @param {string} meetingId
 * @param {Array} actions - Array of action data objects
 * @param {Array} decisions - Array of decision data objects
 * @returns {Promise<void>}
 */
async function batchCreateInsights(meetingId, actions = [], decisions = []) {
  const db = getDb();
  const batch = db.batch();
  const now = FieldValue.serverTimestamp();
  
  const meetingRef = db.collection(MEETINGS_COLLECTION).doc(meetingId);
  
  // Add actions to batch
  for (const actionData of actions) {
    const actionRef = meetingRef.collection(ACTIONS_SUBCOLLECTION).doc();
    batch.set(actionRef, {
      content: actionData.content,
      assignee: actionData.assignee || 'Unassigned',
      status: actionData.status || 'pending',
      sourceWindowId: actionData.sourceWindowId || null,
      createdAt: now,
      updatedAt: now,
    });
  }
  
  // Add decisions to batch
  for (const decisionData of decisions) {
    const decisionRef = meetingRef.collection(DECISIONS_SUBCOLLECTION).doc();
    batch.set(decisionRef, {
      content: decisionData.content,
      confidence: decisionData.confidence || 0,
      sourceWindowId: decisionData.sourceWindowId || null,
      createdAt: now,
      updatedAt: now,
    });
  }
  
  await batch.commit();
}

/**
 * Get all artifacts (actions, decisions) for a meeting
 * @param {string} meetingId
 * @returns {Promise<{actions: Array, decisions: Array}>}
 */
async function getArtifactsByMeeting(meetingId) {
  const db = getDb();
  const meetingRef = db.collection(MEETINGS_COLLECTION).doc(meetingId);
  
  // Fetch actions and decisions in parallel
  const [actionsSnapshot, decisionsSnapshot] = await Promise.all([
    meetingRef.collection(ACTIONS_SUBCOLLECTION).orderBy('createdAt', 'asc').get(),
    meetingRef.collection(DECISIONS_SUBCOLLECTION).orderBy('createdAt', 'asc').get(),
  ]);
  
  const actions = actionsSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }));
  
  const decisions = decisionsSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }));
  
  return { actions, decisions };
}

module.exports = {
  createAction,
  createDecision,
  batchCreateInsights,
  getArtifactsByMeeting,
};
