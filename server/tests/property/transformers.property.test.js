/**
 * Property-Based Tests for Data Transformation Schema Compliance
 * Feature: firebase-migration
 * 
 * Property 9: Data Transformation Schema Compliance
 * For any Firestore document (meeting, action, decision, visual), the transformed
 * API response SHALL contain all fields required by the corresponding frontend
 * TypeScript interface with correct types.
 * 
 * Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5
 */

const fc = require('fast-check');
const {
  transformMeeting,
  transformAction,
  transformDecision,
  transformVisual,
  toDate,
} = require('../../src/utils/transformers');
const { meetingDataArb } = require('../generators/meetingGenerator');
const { actionDataArb, decisionDataArb } = require('../generators/insightGenerator');
const { visualDataArb } = require('../generators/visualGenerator');

/**
 * Generator for Firestore Timestamp-like objects
 */
const firestoreTimestampArb = fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })
  .map(date => ({
    _seconds: Math.floor(date.getTime() / 1000),
    _nanoseconds: (date.getTime() % 1000) * 1000000,
    toDate: () => date,
  }));

/**
 * Generator for Firestore meeting document (simulates what comes from Firestore)
 */
const firestoreMeetingDocArb = fc.record({
  id: fc.string({ minLength: 10, maxLength: 30 }),
  title: fc.string({ minLength: 1, maxLength: 200 }),
  status: fc.constantFrom('live', 'completed', 'scheduled'),
  startTime: firestoreTimestampArb,
  endTime: fc.option(firestoreTimestampArb, { nil: null }),
  participants: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 0, maxLength: 10 }),
  summary: fc.option(fc.string({ minLength: 1, maxLength: 1000 }), { nil: null }),
  createdAt: firestoreTimestampArb,
  updatedAt: firestoreTimestampArb,
});

/**
 * Generator for Firestore action document
 */
const firestoreActionDocArb = fc.record({
  id: fc.string({ minLength: 10, maxLength: 30 }),
  content: fc.string({ minLength: 1, maxLength: 500 }),
  assignee: fc.string({ minLength: 1, maxLength: 100 }),
  status: fc.constantFrom('pending', 'in-progress', 'completed'),
  sourceWindowId: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: null }),
  createdAt: firestoreTimestampArb,
  updatedAt: firestoreTimestampArb,
});

/**
 * Generator for Firestore decision document
 */
const firestoreDecisionDocArb = fc.record({
  id: fc.string({ minLength: 10, maxLength: 30 }),
  content: fc.string({ minLength: 1, maxLength: 500 }),
  confidence: fc.float({ min: 0, max: 1, noNaN: true }),
  sourceWindowId: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: null }),
  participants: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 0, maxLength: 5 }),
  createdAt: firestoreTimestampArb,
  updatedAt: firestoreTimestampArb,
});

/**
 * Generator for Firestore visual document
 */
const firestoreVisualDocArb = fc.record({
  id: fc.string({ minLength: 10, maxLength: 30 }),
  type: fc.constantFrom('bar', 'line', 'pie', 'generic'),
  title: fc.string({ minLength: 1, maxLength: 100 }),
  description: fc.string({ minLength: 0, maxLength: 300 }),
  data: fc.record({
    labels: fc.array(fc.string({ minLength: 1, maxLength: 30 }), { minLength: 1, maxLength: 10 }),
    datasets: fc.array(
      fc.record({
        label: fc.string({ minLength: 1, maxLength: 50 }),
        data: fc.array(fc.float({ noNaN: true, noDefaultInfinity: true }), { minLength: 1, maxLength: 10 }),
      }),
      { minLength: 1, maxLength: 3 }
    ),
  }),
  sourceWindowId: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: null }),
  createdAt: firestoreTimestampArb,
  updatedAt: firestoreTimestampArb,
});

describe('Property Tests: Data Transformation Schema Compliance', () => {
  /**
   * Property 9: Data Transformation Schema Compliance
   * 
   * Feature: firebase-migration, Property 9: Data Transformation Schema Compliance
   * Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5
   */
  describe('Property 9: Data Transformation Schema Compliance', () => {
    /**
     * 8.1: Meeting transformation produces valid Meeting interface
     */
    it('transforms meeting documents to valid Meeting interface (Req 8.1)', async () => {
      await fc.assert(
        fc.asyncProperty(firestoreMeetingDocArb, async (firestoreDoc) => {
          const transformed = transformMeeting(firestoreDoc);
          
          // Verify required fields exist with correct types
          expect(typeof transformed.id).toBe('string');
          expect(transformed.id.length).toBeGreaterThan(0);
          
          expect(typeof transformed.title).toBe('string');
          
          expect(['live', 'completed', 'scheduled']).toContain(transformed.status);
          
          expect(transformed.startTime).toBeInstanceOf(Date);
          
          // endTime can be null or Date
          if (transformed.endTime !== null) {
            expect(transformed.endTime).toBeInstanceOf(Date);
          }
          
          expect(Array.isArray(transformed.participants)).toBe(true);
          
          // summary can be null or string
          if (transformed.summary !== null) {
            expect(typeof transformed.summary).toBe('string');
          }
        }),
        { numRuns: 100 }
      );
    });

    /**
     * 8.2: Action transformation produces valid ActionItem interface
     */
    it('transforms action documents to valid ActionItem interface (Req 8.2)', async () => {
      await fc.assert(
        fc.asyncProperty(firestoreActionDocArb, async (firestoreDoc) => {
          const transformed = transformAction(firestoreDoc);
          
          // Verify required fields exist with correct types
          expect(typeof transformed.id).toBe('string');
          expect(transformed.id.length).toBeGreaterThan(0);
          
          expect(typeof transformed.content).toBe('string');
          
          // assignee can be string (including 'Unassigned')
          expect(typeof transformed.assignee).toBe('string');
          
          // status must be one of the valid enum values (frontend uses underscore)
          expect(['pending', 'in_progress', 'completed']).toContain(transformed.status);
          
          expect(transformed.createdAt).toBeInstanceOf(Date);
        }),
        { numRuns: 100 }
      );
    });

    /**
     * 8.3: Decision transformation produces valid Decision interface
     */
    it('transforms decision documents to valid Decision interface (Req 8.3)', async () => {
      await fc.assert(
        fc.asyncProperty(firestoreDecisionDocArb, async (firestoreDoc) => {
          const transformed = transformDecision(firestoreDoc);
          
          // Verify required fields exist with correct types
          expect(typeof transformed.id).toBe('string');
          expect(transformed.id.length).toBeGreaterThan(0);
          
          expect(typeof transformed.content).toBe('string');
          
          expect(transformed.timestamp).toBeInstanceOf(Date);
          
          expect(Array.isArray(transformed.participants)).toBe(true);
          
          // confidence should be a number between 0 and 1
          expect(typeof transformed.confidence).toBe('number');
          expect(transformed.confidence).toBeGreaterThanOrEqual(0);
          expect(transformed.confidence).toBeLessThanOrEqual(1);
        }),
        { numRuns: 100 }
      );
    });

    /**
     * 8.4: Visual transformation produces valid Visualization interface
     */
    it('transforms visual documents to valid Visualization interface (Req 8.4)', async () => {
      await fc.assert(
        fc.asyncProperty(firestoreVisualDocArb, async (firestoreDoc) => {
          const transformed = transformVisual(firestoreDoc);
          
          // Verify required fields exist with correct types
          expect(typeof transformed.id).toBe('string');
          expect(transformed.id.length).toBeGreaterThan(0);
          
          expect(typeof transformed.title).toBe('string');
          
          expect(typeof transformed.description).toBe('string');
          
          // type must be one of the valid enum values
          expect(['line', 'bar', 'timeline', 'pie']).toContain(transformed.type);
          
          // data must have labels and values arrays
          expect(transformed.data).toBeDefined();
          expect(Array.isArray(transformed.data.labels)).toBe(true);
          expect(Array.isArray(transformed.data.values)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    /**
     * 8.5: Timestamps are converted to Date-compatible values
     */
    it('converts Firestore timestamps to JavaScript Dates (Req 8.5)', async () => {
      await fc.assert(
        fc.asyncProperty(firestoreTimestampArb, async (timestamp) => {
          const converted = toDate(timestamp);
          
          expect(converted).toBeInstanceOf(Date);
          expect(converted.getTime()).not.toBeNaN();
        }),
        { numRuns: 100 }
      );
    });
  });
});
