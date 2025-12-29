/**
 * Property-Based Tests for LLM Demo Mode Determinism
 * Feature: firebase-migration
 * 
 * These tests verify that the LLM Service produces deterministic output
 * in demo mode for the same input.
 */

const fc = require('fast-check');

// Mock the environment to ensure demo mode is enabled
jest.mock('../../src/config/env', () => ({
  DEMO_MODE: true,
  GEMINI_API_KEY: null,
  GROK_API_KEY: null,
}));

// Clear module cache to ensure fresh LLMService instance with mocked env
jest.resetModules();

const LLMService = require('../../src/services/LLMService');

/**
 * Generator for transcript strings that may contain trigger keywords
 */
const transcriptArb = fc.oneof(
  // Transcripts with action item triggers
  fc.string({ minLength: 1, maxLength: 500 }).map(s => `action item: ${s}`),
  fc.string({ minLength: 1, maxLength: 500 }).map(s => `to do: ${s}`),
  // Transcripts with decision triggers
  fc.string({ minLength: 1, maxLength: 500 }).map(s => `we decided ${s}`),
  fc.string({ minLength: 1, maxLength: 500 }).map(s => `team agreed ${s}`),
  // Transcripts with visual triggers
  fc.string({ minLength: 1, maxLength: 500 }).map(s => `sales report: ${s}`),
  fc.string({ minLength: 1, maxLength: 500 }).map(s => `growth metrics: ${s}`),
  fc.string({ minLength: 1, maxLength: 500 }).map(s => `chart showing ${s}`),
  // Random transcripts without triggers
  fc.string({ minLength: 1, maxLength: 500 }),
  // Mixed content
  fc.string({ minLength: 1, maxLength: 200 }).chain(prefix =>
    fc.constantFrom('action item', 'decided', 'sales', 'growth', 'chart', 'agreed', 'to do')
      .map(keyword => `${prefix} ${keyword} ${prefix}`)
  )
);

describe('Property Tests: LLM Demo Mode Determinism', () => {
  /**
   * Property 5: LLM Demo Mode Determinism
   * 
   * For any transcript input processed in Demo Mode, the LLM Service SHALL
   * produce identical output (actions, decisions, visual candidates) when
   * given the same input multiple times.
   * 
   * Feature: firebase-migration, Property 5: LLM Demo Mode Determinism
   * Validates: Requirements 5.5
   */
  it('Property 5: LLM Demo Mode Determinism - same input produces same output', async () => {
    await fc.assert(
      fc.asyncProperty(transcriptArb, async (transcript) => {
        // Process the same transcript multiple times
        const result1 = await LLMService.processWindow(transcript);
        const result2 = await LLMService.processWindow(transcript);
        const result3 = await LLMService.processWindow(transcript);

        // Verify all results are identical
        expect(result1).toEqual(result2);
        expect(result2).toEqual(result3);

        // Verify structure is correct
        expect(result1).toHaveProperty('actions');
        expect(result1).toHaveProperty('decisions');
        expect(result1).toHaveProperty('visualCandidates');
        expect(Array.isArray(result1.actions)).toBe(true);
        expect(Array.isArray(result1.decisions)).toBe(true);
        expect(Array.isArray(result1.visualCandidates)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Additional determinism check: verify specific trigger words produce consistent results
   */
  it('Property 5: LLM Demo Mode Determinism - trigger words produce consistent categorization', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.constantFrom('action item', 'to do', 'decided', 'agreed', 'sales', 'growth', 'chart'),
        async (content, trigger) => {
          const transcript = `${content} ${trigger} ${content}`;
          
          // Process multiple times
          const result1 = await LLMService.processWindow(transcript);
          const result2 = await LLMService.processWindow(transcript);

          // Results must be identical
          expect(result1).toEqual(result2);

          // Verify trigger word produces expected category
          const lower = transcript.toLowerCase();
          
          if (lower.includes('action item') || lower.includes('to do')) {
            expect(result1.actions.length).toBeGreaterThan(0);
          }
          
          if (lower.includes('decided') || lower.includes('agreed')) {
            expect(result1.decisions.length).toBeGreaterThan(0);
          }
          
          if (lower.includes('sales') || lower.includes('growth') || lower.includes('chart')) {
            expect(result1.visualCandidates.length).toBeGreaterThan(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
