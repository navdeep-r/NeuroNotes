/**
 * Property-Based Tests for Artifacts Retrieval Completeness
 * Feature: firebase-migration
 * 
 * These tests verify that all artifacts for a meeting are retrieved completely.
 */

const fc = require('fast-check');
const { meetingDataArb } = require('../generators/meetingGenerator');
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
    orderBy: jest.fn((field, direction) => ({
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
const { createAction, createDecision, getArtifactsByMeeting } = require('../../src/repositories/insightRepository');
const { createVisual, getVisualsByMeeting } = require('../../src/repositories/visualRepository');

describe('Property Tests: Artifacts Retrieval Completeness', () => {
  beforeEach(() => {
    mockDb = createMockFirestore();
  });

  /**
   * Property 8: Artifacts Retrieval Completeness
   * 
   * For any meeting with associated artifacts, the GET /api/meetings/{id}/artifacts
   * endpoint SHALL return all actions, decisions, and visuals belonging to that
   * meeting with no missing items.
   * 
   * Feature: firebase-migration, Property 8: Artifacts Retrieval Completeness
   * Validates: Requirements 7.3
   */
  it('Property 8: Artifacts Retrieval Completeness', async () => {
    await fc.assert(
      fc.asyncProperty(
        meetingDataArb,
        fc.array(actionDataArb, { minLength: 0, maxLength: 5 }),
        fc.array(decisionDataArb, { minLength: 0, maxLength: 5 }),
        fc.array(visualDataArb, { minLength: 0, maxLength: 5 }),
        async (meetingData, actionsData, decisionsData, visualsData) => {
          // Reset mock database for each property test iteration
          mockDb = createMockFirestore();
          
          // Create a meeting
          const meeting = await createMeeting(meetingData);
          
          // Create actions
          const createdActions = [];
          for (const actionData of actionsData) {
            const action = await createAction(meeting.id, actionData);
            createdActions.push(action);
          }
          
          // Create decisions
          const createdDecisions = [];
          for (const decisionData of decisionsData) {
            const decision = await createDecision(meeting.id, decisionData);
            createdDecisions.push(decision);
          }
          
          // Create visuals
          const createdVisuals = [];
          for (const visualData of visualsData) {
            const visual = await createVisual(meeting.id, visualData);
            createdVisuals.push(visual);
          }
          
          // Retrieve all artifacts
          const { actions, decisions } = await getArtifactsByMeeting(meeting.id);
          const visuals = await getVisualsByMeeting(meeting.id);
          
          // Verify completeness: all created artifacts should be retrieved
          expect(actions.length).toBe(createdActions.length);
          expect(decisions.length).toBe(createdDecisions.length);
          expect(visuals.length).toBe(createdVisuals.length);
          
          // Verify all action IDs are present
          const retrievedActionIds = new Set(actions.map(a => a.id));
          for (const created of createdActions) {
            expect(retrievedActionIds.has(created.id)).toBe(true);
          }
          
          // Verify all decision IDs are present
          const retrievedDecisionIds = new Set(decisions.map(d => d.id));
          for (const created of createdDecisions) {
            expect(retrievedDecisionIds.has(created.id)).toBe(true);
          }
          
          // Verify all visual IDs are present
          const retrievedVisualIds = new Set(visuals.map(v => v.id));
          for (const created of createdVisuals) {
            expect(retrievedVisualIds.has(created.id)).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional property: Content integrity of retrieved artifacts
   */
  it('Property 8b: Retrieved artifacts have correct content', async () => {
    await fc.assert(
      fc.asyncProperty(
        meetingDataArb,
        fc.array(actionDataArb, { minLength: 1, maxLength: 3 }),
        fc.array(decisionDataArb, { minLength: 1, maxLength: 3 }),
        async (meetingData, actionsData, decisionsData) => {
          // Reset mock database for each property test iteration
          mockDb = createMockFirestore();
          
          // Create a meeting
          const meeting = await createMeeting(meetingData);
          
          // Create actions and track their content
          const actionContents = new Set();
          for (const actionData of actionsData) {
            await createAction(meeting.id, actionData);
            actionContents.add(actionData.content);
          }
          
          // Create decisions and track their content
          const decisionContents = new Set();
          for (const decisionData of decisionsData) {
            await createDecision(meeting.id, decisionData);
            decisionContents.add(decisionData.content);
          }
          
          // Retrieve artifacts
          const { actions, decisions } = await getArtifactsByMeeting(meeting.id);
          
          // Verify content is preserved
          for (const action of actions) {
            expect(actionContents.has(action.content)).toBe(true);
          }
          
          for (const decision of decisions) {
            expect(decisionContents.has(decision.content)).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
