/**
 * Property-Based Tests for Caption Ingestion Persistence
 * Feature: firebase-migration
 * 
 * These tests verify that caption chunks are properly persisted to Firestore.
 */

const fc = require('fast-check');
const { meetingDataArb } = require('../generators/meetingGenerator');

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

// Mock DEMO_MODE to be false for these tests
jest.mock('../../src/config/env', () => ({
  DEMO_MODE: false,
}));

const { createMeeting, getMeetingById } = require('../../src/repositories/meetingRepository');
const { upsertMinuteWindow, getMinutesByMeeting } = require('../../src/repositories/minuteRepository');

/**
 * Generator for valid caption chunk data
 */
const captionChunkArb = fc.record({
  text: fc.string({ minLength: 1, maxLength: 500 }),
  timestamp: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
  speaker: fc.string({ minLength: 1, maxLength: 50 }),
});

describe('Property Tests: Caption Ingestion Persistence', () => {
  beforeEach(() => {
    mockDb = createMockFirestore();
  });

  /**
   * Property 4: Caption Ingestion Persistence
   * 
   * For any valid caption chunk (meetingId, text, timestamp, speaker), ingesting it
   * SHALL result in the transcript being stored in the corresponding MinuteWindow
   * document in Firestore.
   * 
   * Feature: firebase-migration, Property 4: Caption Ingestion Persistence
   * Validates: Requirements 4.2
   */
  it('Property 4: Caption Ingestion Persistence', async () => {
    await fc.assert(
      fc.asyncProperty(
        meetingDataArb,
        captionChunkArb,
        async (meetingData, captionChunk) => {
          // Create a meeting first
          const meeting = await createMeeting(meetingData);
          expect(meeting.id).toBeDefined();
          
          // Verify meeting exists
          const retrievedMeeting = await getMeetingById(meeting.id);
          expect(retrievedMeeting).not.toBeNull();
          
          // Calculate minute window boundaries (same logic as ingestController)
          const chunkTime = new Date(captionChunk.timestamp);
          const windowStart = new Date(chunkTime);
          windowStart.setSeconds(0, 0);
          const windowEnd = new Date(windowStart);
          windowEnd.setMinutes(windowEnd.getMinutes() + 1);
          
          // Simulate caption ingestion by writing to Firestore
          await upsertMinuteWindow(meeting.id, {
            startTime: windowStart,
            endTime: windowEnd,
            transcript: captionChunk.text,
            speaker: captionChunk.speaker,
            processed: false,
          });
          
          // Verify the transcript was persisted
          const minutes = await getMinutesByMeeting(meeting.id);
          
          // Should have at least one minute window
          expect(minutes.length).toBeGreaterThanOrEqual(1);
          
          // Find the minute window containing our transcript
          const matchingMinute = minutes.find(m => m.transcript === captionChunk.text);
          expect(matchingMinute).toBeDefined();
          
          // Verify the transcript content matches
          expect(matchingMinute.transcript).toBe(captionChunk.text);
          expect(matchingMinute.speaker).toBe(captionChunk.speaker);
          expect(matchingMinute.processed).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional property: Multiple caption chunks for same meeting
   * 
   * For any meeting and multiple caption chunks, all chunks should be persisted
   * and retrievable from Firestore.
   */
  it('Property 4b: Multiple caption chunks are all persisted', async () => {
    await fc.assert(
      fc.asyncProperty(
        meetingDataArb,
        fc.array(captionChunkArb, { minLength: 1, maxLength: 5 }),
        async (meetingData, captionChunks) => {
          // Create a meeting first
          const meeting = await createMeeting(meetingData);
          
          // Ingest all caption chunks
          for (const chunk of captionChunks) {
            const chunkTime = new Date(chunk.timestamp);
            const windowStart = new Date(chunkTime);
            windowStart.setSeconds(0, 0);
            const windowEnd = new Date(windowStart);
            windowEnd.setMinutes(windowEnd.getMinutes() + 1);
            
            await upsertMinuteWindow(meeting.id, {
              startTime: windowStart,
              endTime: windowEnd,
              transcript: chunk.text,
              speaker: chunk.speaker,
              processed: false,
            });
          }
          
          // Verify all chunks were persisted
          const minutes = await getMinutesByMeeting(meeting.id);
          
          // Should have minute windows for all chunks
          expect(minutes.length).toBeGreaterThanOrEqual(1);
          
          // All transcripts should be present in the minute windows
          const allTranscripts = minutes.map(m => m.transcript);
          for (const chunk of captionChunks) {
            expect(allTranscripts).toContain(chunk.text);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
