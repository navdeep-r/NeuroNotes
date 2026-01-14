/**
 * Data transformation utilities for converting Firestore documents
 * to frontend-compatible formats matching TypeScript interfaces.
 * 
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 */

/**
 * Convert Firestore Timestamp or Date to JavaScript Date
 * @param {Object|Date|null} timestamp - Firestore Timestamp or Date
 * @returns {Date|null}
 */
function toDate(timestamp) {
  if (!timestamp) return null;
  if (timestamp instanceof Date) return timestamp;
  if (typeof timestamp.toDate === 'function') return timestamp.toDate();
  if (timestamp._seconds !== undefined) {
    return new Date(timestamp._seconds * 1000 + (timestamp._nanoseconds || 0) / 1000000);
  }
  return new Date(timestamp);
}

/**
 * Extract data from a Firestore document or plain object
 * Handles both Firestore DocumentSnapshot (with data() method) and plain objects
 * @param {Object} doc - Firestore document or plain object
 * @returns {Object} The document data
 */
function extractData(doc) {
  if (!doc) return {};
  if (typeof doc.toObject === 'function') {
    return doc.toObject();
  }
  if (typeof doc.data === 'function') {
    return doc.data();
  }
  return doc;
}

/**
 * Transform Firestore meeting document to frontend Meeting interface
 * 
 * Frontend Meeting interface expects:
 * - id: string
 * - title: string
 * - status: 'live' | 'completed' | 'scheduled'
 * - startTime: Date
 * - endTime?: Date
 * - participants: Speaker[]
 * 
 * @param {Object} doc - Firestore document with id and data
 * @returns {Object} Transformed meeting matching frontend interface
 */
function transformMeeting(doc) {
  if (!doc) return null;

  const data = extractData(doc);
  const id = (doc.id || doc._id || data.id || data._id || '').toString();

  return {
    id,
    title: data.title || 'Untitled Meeting',
    status: data.status || 'scheduled',
    startTime: toDate(data.startTime),
    endTime: toDate(data.endTime),
    participants: data.participants || [],
    summary: data.summary || null,
  };
}

/**
 * Transform Firestore action document to frontend ActionItem interface
 * 
 * Frontend ActionItem interface expects:
 * - id: string
 * - content: string
 * - assignee?: Speaker
 * - status: 'pending' | 'in_progress' | 'completed'
 * - createdAt: Date
 * 
 * @param {Object} doc - Firestore document with id and data
 * @returns {Object} Transformed action matching frontend interface
 */
function transformAction(doc) {
  if (!doc) return null;

  const data = extractData(doc);
  const id = (doc.id || doc._id || data.id || data._id || '').toString();

  return {
    id,
    content: data.content || '',
    assignee: data.assignee || 'Unassigned',
    status: normalizeStatus(data.status),
    createdAt: toDate(data.createdAt),
  };
}

/**
 * Normalize status values to match frontend enum
 * Converts 'in-progress' to 'in_progress' for frontend compatibility
 * @param {string} status
 * @returns {string}
 */
function normalizeStatus(status) {
  if (!status) return 'pending';
  // Handle both 'in-progress' (Firestore) and 'in_progress' (frontend)
  if (status === 'in-progress') return 'in_progress';
  return status;
}

/**
 * Transform Firestore decision document to frontend Decision interface
 * 
 * Frontend Decision interface expects:
 * - id: string
 * - content: string
 * - timestamp: Date
 * - participants: string[]
 * 
 * @param {Object} doc - Firestore document with id and data
 * @returns {Object} Transformed decision matching frontend interface
 */
function transformDecision(doc) {
  if (!doc) return null;

  const data = extractData(doc);
  const id = (doc.id || doc._id || data.id || data._id || '').toString();

  return {
    id,
    content: data.content || '',
    timestamp: toDate(data.createdAt),
    confidence: data.confidence || 0,
    participants: data.participants || [],
  };
}

/**
 * Transform Firestore visual document to frontend Visualization interface
 * 
 * Frontend Visualization interface expects:
 * - id: string
 * - title: string
 * - description: string
 * - type: 'line' | 'bar' | 'timeline' | 'pie'
 * - data: { labels: string[], values: number[] }
 * 
 * @param {Object} doc - Firestore document with id and data
 * @returns {Object} Transformed visual matching frontend interface
 */
function transformVisual(doc) {
  if (!doc) return null;

  const data = extractData(doc);
  const id = (doc.id || doc._id || data.id || data._id || '').toString();

  // Convert Firestore data structure to frontend ChartData format
  const chartData = data.data || {};
  const labels = chartData.labels || [];
  const values = chartData.datasets?.[0]?.data || chartData.values || [];

  return {
    id,
    title: data.title || '',
    description: data.description || '',
    type: normalizeVisualType(data.type),
    data: {
      labels,
      values,
    },
  };
}

/**
 * Normalize visual type to match frontend enum
 * Maps 'generic' to 'bar' as default
 * @param {string} type
 * @returns {string}
 */
function normalizeVisualType(type) {
  const validTypes = ['line', 'bar', 'timeline', 'pie'];
  if (validTypes.includes(type)) return type;
  return 'bar'; // Default for 'generic' or unknown types
}

/**
 * Transform MongoDB automation document to frontend interface
 */
function transformAutomation(doc) {
  if (!doc) return null;
  const data = extractData(doc);
  const id = (doc.id || doc._id || data.id || data._id || '').toString();

  return {
    ...data,
    id,
    meetingId: data.meetingId && typeof data.meetingId === 'object' ? {
      id: (data.meetingId.id || data.meetingId._id || '').toString(),
      title: data.meetingId.title
    } : (data.meetingId ? data.meetingId.toString() : null)
  };
}

module.exports = {
  toDate,
  extractData,
  transformMeeting,
  transformAction,
  transformDecision,
  transformVisual,
  transformAutomation,
  normalizeStatus,
  normalizeVisualType,
};
