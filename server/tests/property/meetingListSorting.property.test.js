/**
 * Property-Based Tests for Meeting List Sorting
 * Feature: firebase-migration
 * 
 * These tests verify that meetings are returned sorted by createdAt in descending order.
 */

const fc = require('fast-check');
const { meetingDataArb } = require('../generators/meetingGenerator');

// Mock Firebase Admin SDK for testing
jest.mock('firebase-admin/firestore', () => ({
  FieldValue: {
    serverTimestamp: jest.fn(() => new Date()),
  },
}));

// In-memory Firestore mock with sorting support
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
            
            // Handle Date objects and timestamps
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
          
          // Apply limit
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

describe('Property Tests: Meeting List Sorting', () => {
  beforeEach(() => {
    mockDb = createMockFirestore();
  });

  /**
   * Property 6: Meeting List Sorting
   * 
   * For any set of meetings in Firestore, the GET /api/meetings endpoint
   * SHALL return them sorted by createdAt in descending order (newest first).
   * 
   * Feature: firebase-migration, Property 6: Meeting List Sorting
   * Validates: Requirements 7.1
   */
  it('Property 6: Meeting List Sorting', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(meetingDataArb, { minLength: 2, maxLength: 10 }),
        async (meetingsData) => {
          // Reset mock database for each property test iteration
          mockDb = createMockFirestore();
          
          // Create meetings with different timestamps
          const createdMeetings = [];
          for (let i = 0; i < meetingsData.length; i++) {
            const meeting = await createMeeting(meetingsData[i]);
            createdMeetings.push(meeting);
          }
          
          // Get all meetings (should be sorted by createdAt desc)
          const retrievedMeetings = await getAllMeetings();
          
          // Verify we got all meetings
          expect(retrievedMeetings.length).toBe(createdMeetings.length);
          
          // Verify sorting: each meeting's createdAt should be >= the next one's
          for (let i = 0; i < retrievedMeetings.length - 1; i++) {
            const currentCreatedAt = retrievedMeetings[i].createdAt;
            const nextCreatedAt = retrievedMeetings[i + 1].createdAt;
            
            // Convert to timestamps for comparison
            const currentTime = currentCreatedAt instanceof Date ? 
              currentCreatedAt.getTime() : 
              new Date(currentCreatedAt).getTime();
            const nextTime = nextCreatedAt instanceof Date ? 
              nextCreatedAt.getTime() : 
              new Date(nextCreatedAt).getTime();
            
            // Current should be >= next (descending order)
            expect(currentTime).toBeGreaterThanOrEqual(nextTime);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional property: Sorting is stable across multiple retrievals
   */
  it('Property 6b: Sorting is consistent across retrievals', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(meetingDataArb, { minLength: 2, maxLength: 5 }),
        async (meetingsData) => {
          // Reset mock database for each property test iteration
          mockDb = createMockFirestore();
          
          // Create meetings
          for (const data of meetingsData) {
            await createMeeting(data);
          }
          
          // Retrieve meetings multiple times
          const firstRetrieval = await getAllMeetings();
          const secondRetrieval = await getAllMeetings();
          
          // Both retrievals should have same order
          expect(firstRetrieval.length).toBe(secondRetrieval.length);
          
          for (let i = 0; i < firstRetrieval.length; i++) {
            expect(firstRetrieval[i].id).toBe(secondRetrieval[i].id);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
