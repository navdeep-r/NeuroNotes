const Action = require('../models/Action');
const Decision = require('../models/Decision');

/**
 * Create action item
 */
async function createAction(meetingId, actionData) {
  const action = new Action({
    meetingId,
    content: actionData.content,
    assignee: actionData.assignee || 'Unassigned',
    status: actionData.status || 'pending',
    sourceWindowId: actionData.sourceWindowId || null,
  });
  await action.save();
  return action.toObject();
}

/**
 * Create decision
 */
async function createDecision(meetingId, decisionData) {
  const decision = new Decision({
    meetingId,
    content: decisionData.content,
    confidence: decisionData.confidence || 0,
    sourceWindowId: decisionData.sourceWindowId || null,
  });
  await decision.save();
  return decision.toObject();
}

/**
 * Batch create multiple insights
 */
async function batchCreateInsights(meetingId, actions = [], decisions = []) {
  const actionDocs = actions.map(a => ({ ...a, meetingId }));
  const decisionDocs = decisions.map(d => ({ ...d, meetingId }));

  if (actionDocs.length > 0) await Action.insertMany(actionDocs);
  if (decisionDocs.length > 0) await Decision.insertMany(decisionDocs);
}

/**
 * Get all artifacts for a meeting
 */
async function getArtifactsByMeeting(meetingId) {
  const [actions, decisions] = await Promise.all([
    Action.find({ meetingId }).sort({ createdAt: 1 }),
    Decision.find({ meetingId }).sort({ createdAt: 1 }),
  ]);

  return {
    actions: actions.map(a => a.toObject()),
    decisions: decisions.map(d => d.toObject())
  };
}

module.exports = {
  createAction,
  createDecision,
  batchCreateInsights,
  getArtifactsByMeeting,
};
