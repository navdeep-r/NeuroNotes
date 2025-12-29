/**
 * Property-Based Tests for Query Result Limiting
 * Feature: firebase-migration
 * 
 * These tests verify that query results are properly limited to prevent unbounded reads.
 */

const fc = require('fast-check');
const { meetingDataArb } = require('../generators/meetingGenerator');

// Mock Firebase Admin SDK for testing
jest.mock('firebase-admin/firestore', () => ({
  FieldValue: {
    serverTimestamp: jest.fn(() => new Date()),
  },
}));

// In-memory Firestore mock with limit support
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
      limit: jest.fn((limitCount) => ({
        get: jest.fn(async () => {
          const col = getOrCreateCollection(path);
          let entries = Object.entries(col);
          
          // Sort by the specified field
          entries.sort((a, b) => {
            const aVal = a[1][field];
            const bVal = b[1][field];
            
            const aTime = aVal instanceof Date ? aVal.getTime() : 
                         (aVal && aVal._seconds) ? aVal._seconds * 1000 : 
                         new Date(aVal).getTime();
            const bTime = bVal instanceof Date ? bVal.getTime() : 
                         (bVal && bVal._seconds) ? bVal._seconds * 1000 : 
                         new Date(bVal).getTime();
            
            if (direction === 'desc') {
              return bTime - aTime;
            }
            return aTime - bTime;
          });
          
          // Apply limit - this is the key behavior we're testing
          if (limitCount) {
            entries = entries.slice(0, limitCount);
          }
          
          return {
            docs: entries.map(([id, data]) => ({
              id,
              data: () => data,
            })),
          };
        }),
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
    _collections: collections,
  };
};

let mockDb;

jest.mock('../../src/config/firebase', () => ({
  getDb: () => mockDb,
}));

const { createMeeting, getAllMeetings } = require('../../src/repositories/meetingRepository');

describe('Property Tests: Query Result Limiting', () => {
  beforeEach(() => {
    mockDb = createMockFirestore();
  });

  /**
   * Property 11: Query Result Limiting
   * 
   * For any meeting list query, the API SHALL return at most the configured
   * limit of results (default 50) to prevent unbounded reads.
   * 
   * Feature: firebase-migration, Property 11: Query Result Limiting
   * Validates: Requirements 10.4
   */
  it('Property 11: Query Result Limiting', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate a number of meetings that may exceed the limit
        fc.integer({ min: 1, max: 100 }),
        // Generate a limit value
        fc.integer({ min: 1, max: 50 }),
        async (numMeetings, limit) => {
          // Reset mock database for each property test iteration
          mockDb = createMockFirestore();
          
          // Create the specified number of meetings
          for (let i = 0; i < numMeetings; i++) {
            await createMeeting({
              title: `Meeting ${i}`,
              status: 'completed',
              startTime: new Date(),
              participants: [],
            });
          }
          
          // Query with the specified limit
          const meetings = await getAllMeetings(limit);
          
          // Verify the result count does not exceed the limit
          expect(meetings.length).toBeLessThanOrEqual(limit);
          
          // If we created more meetings than the limit, we should get exactly the limit
          if (numMeetings >= limit) {
            expect(meetings.length).toBe(limit);
          } else {
            // If we created fewer meetings than the limit, we should get all of them
            expect(meetings.length).toBe(numMeetings);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional property: Default limit is applied when no limit specified
   */
  it('Property 11b: Default limit of 50 is applied', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate a number of meetings that exceeds the default limit
        fc.integer({ min: 51, max: 75 }),
        async (numMeetings) => {
          // Reset mock database for each property test iteration
          mockDb = createMockFirestore();
          
          // Create more meetings than the default limit
          for (let i = 0; i < numMeetings; i++) {
            await createMeeting({
              title: `Meeting ${i}`,
              status: 'completed',
              startTime: new Date(),
              participants: [],
            });
          }
          
          // Query without specifying a limit (should use default of 50)
          const meetings = await getAllMeetings();
          
          // Verify the result count does not exceed the default limit of 50
          expect(meetings.length).toBeLessThanOrEqual(50);
          expect(meetings.length).toBe(50);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional property: Limit of 0 or negative returns empty or uses default
   */
  it('Property 11c: Small limits work correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 10, max: 20 }),
        fc.integer({ min: 1, max: 5 }),
        async (numMeetings, smallLimit) => {
          // Reset mock database for each property test iteration
          mockDb = createMockFirestore();
          
          // Create meetings
          for (let i = 0; i < numMeetings; i++) {
            await createMeeting({
              title: `Meeting ${i}`,
              status: 'completed',
              startTime: new Date(),
              participants: [],
            });
          }
          
          // Query with a small limit
          const meetings = await getAllMeetings(smallLimit);
          
          // Should return exactly the limit since we have more meetings
          expect(meetings.length).toBe(smallLimit);
        }
      ),
      { numRuns: 100 }
    );
  });
});
