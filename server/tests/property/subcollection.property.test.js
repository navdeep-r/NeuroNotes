/**
 * Property-Based Tests for Subcollection Structure Integrity
 * Feature: firebase-migration
 * 
 * These tests verify that subcollection documents are retrievable at their designated paths.
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

describe('Property Tests: Subcollection Structure', () => {
  beforeEach(() => {
    mockDb = createMockFirestore();
  });

  /**
   * Property 2: Subcollection Structure Integrity
   * 
   * For any meeting with associated minute windows, actions, decisions, and visuals,
   * all subcollection documents SHALL be retrievable at their designated paths.
   * 
   * Feature: firebase-migration, Property 2: Subcollection Structure Integrity
   * Validates: Requirements 1.2, 1.3, 1.4, 1.5
   */
  it('Property 2: Subcollection Structure Integrity', async () => {
    await fc.assert(
      fc.asyncProperty(
        meetingDataArb,
        fc.array(minuteDataArb, { minLength: 1, maxLength: 3 }),
        fc.array(actionDataArb, { minLength: 1, maxLength: 3 }),
        fc.array(decisionDataArb, { minLength: 1, maxLength: 3 }),
        fc.array(visualDataArb, { minLength: 1, maxLength: 3 }),
        async (meetingData, minutesData, actionsData, decisionsData, visualsData) => {
          // Create meeting
          const meeting = await createMeeting(meetingData);
          expect(meeting.id).toBeDefined();
          
          // Create minute windows in subcollection
          const createdMinutes = [];
          for (const minuteData of minutesData) {
            const minute = await upsertMinuteWindow(meeting.id, minuteData);
            createdMinutes.push(minute);
          }
          
          // Create actions in subcollection
          const createdActions = [];
          for (const actionData of actionsData) {
            const action = await createAction(meeting.id, actionData);
            createdActions.push(action);
          }
          
          // Create decisions in subcollection
          const createdDecisions = [];
          for (const decisionData of decisionsData) {
            const decision = await createDecision(meeting.id, decisionData);
            createdDecisions.push(decision);
          }
          
          // Create visuals in subcollection
          const createdVisuals = [];
          for (const visualData of visualsData) {
            const visual = await createVisual(meeting.id, visualData);
            createdVisuals.push(visual);
          }
          
          // Verify all subcollection documents are retrievable
          const retrievedMinutes = await getMinutesByMeeting(meeting.id);
          expect(retrievedMinutes.length).toBe(createdMinutes.length);
          
          const { actions, decisions } = await getArtifactsByMeeting(meeting.id);
          expect(actions.length).toBe(createdActions.length);
          expect(decisions.length).toBe(createdDecisions.length);
          
          const retrievedVisuals = await getVisualsByMeeting(meeting.id);
          expect(retrievedVisuals.length).toBe(createdVisuals.length);
          
          // Verify each created document has a valid ID
          for (const minute of retrievedMinutes) {
            expect(minute.id).toBeDefined();
            expect(typeof minute.id).toBe('string');
          }
          
          for (const action of actions) {
            expect(action.id).toBeDefined();
            expect(typeof action.id).toBe('string');
          }
          
          for (const decision of decisions) {
            expect(decision.id).toBeDefined();
            expect(typeof decision.id).toBe('string');
          }
          
          for (const visual of retrievedVisuals) {
            expect(visual.id).toBeDefined();
            expect(typeof visual.id).toBe('string');
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
