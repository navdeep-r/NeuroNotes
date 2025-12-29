/**
 * Property-Based Tests for Data Write Round-Trip Consistency
 * Feature: firebase-migration
 * 
 * These tests verify that transcript, insight, and visual artifact data
 * written to Firestore can be read back with all fields intact.
 */

const fc = require('fast-check');
const { meetingDataArb } = require('../generators/meetingGenerator');
const { minuteDataArb } = require('../generators/minuteGenerator');
const { actionDataArb, decisionDataArb } = require('../generators/insightGenerator');
const { visualDataArb } = require('../generators/visualGenerator');

// Mock Firebase Admin SDK for testing
jest.mock('firebase-admin/firestore', () => ({
  FieldValue: {
    serverTimestamp: jest.fn(() => new Date()),
  },
}));

// In-memory Firestore mock with subcollection support
const createMockFirestore = () => {
  const collections = {};
  
  const getOrCreateCollection = (path) => {
    if (!collections[path]) {
      collections[path] = {};
    }
    return collections[path];
  };
  
  const createDocRef = (collectionPath, docId) => {
    return {
      id: docId,
      get: jest.fn(async () => {
        const col = getOrCreateCollection(collectionPath);
        return {
          exists: !!col[docId],
          id: docId,
          data: () => col[docId],
        };
      }),
      set: jest.fn(async (data, options) => {
        const col = getOrCreateCollection(collectionPath);
        if (options?.merge) {
          col[docId] = { ...col[docId], ...data };
        } else {
          col[docId] = { ...data };
        }
      }),
      update: jest.fn(async (updates) => {
        const col = getOrCreateCollection(collectionPath);
        col[docId] = { ...col[docId], ...updates };
      }),
      collection: jest.fn((subName) => createCollectionRef(`${collectionPath}/${docId}/${subName}`)),
    };
  };
  
  const createCollectionRef = (path) => ({
    add: jest.fn(async (data) => {
      const id = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const col = getOrCreateCollection(path);
      col[id] = { ...data };
      return createDocRef(path, id);
    }),
    doc: jest.fn((id) => {
      const docId = id || `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      return createDocRef(path, docId);
    }),
    orderBy: jest.fn(() => ({
      get: jest.fn(async () => {
        const col = getOrCreateCollection(path);
        return {
          docs: Object.entries(col).map(([id, data]) => ({
            id,
            data: () => data,
          })),
        };
      }),
      limit: jest.fn(() => ({
        get: jest.fn(async () => {
          const col = getOrCreateCollection(path);
          return {
            docs: Object.entries(col).map(([id, data]) => ({
              id,
              data: () => data,
            })),
          };
        }),
      })),
    })),
    get: jest.fn(async () => {
      const col = getOrCreateCollection(path);
      return {
        docs: Object.entries(col).map(([id, data]) => ({
          id,
          data: () => data,
        })),
      };
    }),
  });
  
  return {
    collection: jest.fn((name) => createCollectionRef(name)),
    batch: jest.fn(() => {
      const operations = [];
      return {
        set: jest.fn((ref, data) => {
          operations.push({ type: 'set', ref, data });
        }),
        commit: jest.fn(async () => {
          for (const op of operations) {
            await op.ref.set(op.data);
          }
        }),
      };
    }),
    _collections: collections,
  };
};

let mockDb;

jest.mock('../../src/config/firebase', () => ({
  getDb: () => mockDb,
}));

const { createMeeting } = require('../../src/repositories/meetingRepository');
const { upsertMinuteWindow, getMinutesByMeeting } = require('../../src/repositories/minuteRepository');
const { createAction, createDecision, getArtifactsByMeeting } = require('../../src/repositories/insightRepository');
const { createVisual, getVisualsByMeeting } = require('../../src/repositories/visualRepository');

describe('Property Tests: Data Write Round-Trip', () => {
  beforeEach(() => {
    mockDb = createMockFirestore();
  });

  /**
   * Property 3: Data Write Round-Trip Consistency
   * 
   * For any transcript, insight, or visual artifact written to Firestore,
   * reading it back from the appropriate subcollection SHALL produce an
   * equivalent document with all fields intact.
   * 
   * Feature: firebase-migration, Property 3: Data Write Round-Trip Consistency
   * Validates: Requirements 3.1, 3.2, 3.3
   */
  it('Property 3: Data Write Round-Trip Consistency', async () => {
    await fc.assert(
      fc.asyncProperty(
        meetingDataArb,
        minuteDataArb,
        actionDataArb,
        decisionDataArb,
        visualDataArb,
        async (meetingData, minuteData, actionData, decisionData, visualData) => {
          // Create meeting first
          const meeting = await createMeeting(meetingData);
          
          // Test minute window round-trip (Requirement 3.1)
          const createdMinute = await upsertMinuteWindow(meeting.id, minuteData);
          const retrievedMinutes = await getMinutesByMeeting(meeting.id);
          const retrievedMinute = retrievedMinutes.find(m => m.id === createdMinute.id);
          
          expect(retrievedMinute).toBeDefined();
          expect(retrievedMinute.transcript).toBe(minuteData.transcript);
          expect(retrievedMinute.processed).toBe(minuteData.processed);
          
          // Test action round-trip (Requirement 3.2)
          const createdAction = await createAction(meeting.id, actionData);
          const { actions } = await getArtifactsByMeeting(meeting.id);
          const retrievedAction = actions.find(a => a.id === createdAction.id);
          
          expect(retrievedAction).toBeDefined();
          expect(retrievedAction.content).toBe(actionData.content);
          // Assignee defaults to 'Unassigned' if not provided
          expect(retrievedAction.assignee).toBe(actionData.assignee || 'Unassigned');
          // Status defaults to 'pending' if not provided
          expect(retrievedAction.status).toBe(actionData.status || 'pending');
          
          // Test decision round-trip (Requirement 3.2)
          const createdDecision = await createDecision(meeting.id, decisionData);
          const { decisions } = await getArtifactsByMeeting(meeting.id);
          const retrievedDecision = decisions.find(d => d.id === createdDecision.id);
          
          expect(retrievedDecision).toBeDefined();
          expect(retrievedDecision.content).toBe(decisionData.content);
          expect(retrievedDecision.confidence).toBe(decisionData.confidence);
          
          // Test visual round-trip (Requirement 3.3)
          const createdVisual = await createVisual(meeting.id, visualData);
          const retrievedVisuals = await getVisualsByMeeting(meeting.id);
          const retrievedVisual = retrievedVisuals.find(v => v.id === createdVisual.id);
          
          expect(retrievedVisual).toBeDefined();
          expect(retrievedVisual.type).toBe(visualData.type);
          expect(retrievedVisual.title).toBe(visualData.title);
          expect(retrievedVisual.data).toEqual(visualData.data);
        }
      ),
      { numRuns: 100 }
    );
  });
});
