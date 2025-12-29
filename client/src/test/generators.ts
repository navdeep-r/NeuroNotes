import * as fc from 'fast-check'
import { Speaker, Meeting, TranscriptEntry, Visualization } from '../types'

/**
 * Test generators for property-based testing
 * Used across all property tests for consistent data generation
 */

// Speaker generator
export const speakerArb = fc.record({
  id: fc.uuid(),
  name: fc.stringMatching(/^[A-Za-z][A-Za-z ]{0,48}[A-Za-z]$/).filter(s => s.trim().length > 0),
  initials: fc.stringMatching(/^[A-Z]{1,2}$/),
  color: fc.hexaString({ minLength: 6, maxLength: 6 }).map(s => `#${s}`),
}) as fc.Arbitrary<Speaker>

// Meeting status generator
export const meetingStatusArb = fc.constantFrom('live', 'completed', 'scheduled') as fc.Arbitrary<'live' | 'completed' | 'scheduled'>

// Meeting generator (without transcript for simplicity)
export const meetingArb = fc.record({
  id: fc.uuid(),
  title: fc.stringMatching(/^[A-Za-z][A-Za-z0-9 ]{0,98}[A-Za-z0-9]$/).filter(s => s.trim().length > 0),
  status: meetingStatusArb,
  startTime: fc.date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') }),
  participants: fc.array(speakerArb, { minLength: 1, maxLength: 5 }),
  transcript: fc.constant([]),
  duration: fc.option(fc.nat({ max: 7200 }), { nil: undefined }),
}) as fc.Arbitrary<Meeting>

// Transcript entry generator
export const transcriptEntryArb = (speaker: Speaker) => fc.record({
  id: fc.uuid(),
  speakerId: fc.constant(speaker.id),
  speaker: fc.constant(speaker),
  timestamp: fc.date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') }),
  content: fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0),
}) as fc.Arbitrary<TranscriptEntry>

// Content with metrics generator
export const contentWithMetricsArb = fc.oneof(
  fc.constant('We achieved 85% completion rate'),
  fc.constant('The budget is $2.5M for this quarter'),
  fc.constant('Sales increased by 23% this month'),
  fc.nat({ max: 100 }).map(n => `We hit ${n}% of our target`),
  fc.nat({ max: 1000000 }).map(n => `Revenue reached $${n.toLocaleString()}`),
)

// Content with decisions generator
export const contentWithDecisionsArb = fc.oneof(
  fc.constant("Let's move forward with the new proposal"),
  fc.constant('We decided to postpone the launch'),
  fc.constant('The team agreed on the new timeline'),
  fc.constant("I've decided we should prioritize mobile"),
  fc.constant('Decision: approve the budget increase'),
)

// Content with actions generator
export const contentWithActionsArb = fc.oneof(
  fc.constant("I'll prepare the report by tomorrow"),
  fc.constant('Action item: review the documentation'),
  fc.constant("I will reach out to the client by end of day"),
  fc.constant("I'll start working on the initial draft by Wednesday"),
  fc.constant('Will compile the data by Friday'),
)

// Plain content without highlights
export const plainContentArb = fc.oneof(
  fc.constant('Good morning everyone'),
  fc.constant('Thanks for joining the call'),
  fc.constant('Any questions so far'),
  fc.constant('That sounds good to me'),
  fc.string({ minLength: 10, maxLength: 100 }).filter(s => 
    !s.includes('%') && 
    !s.includes('$') && 
    !s.toLowerCase().includes('decided') &&
    !s.toLowerCase().includes("i'll") &&
    !s.toLowerCase().includes('action')
  ),
)

// Visualization generator
export const visualizationArb = fc.record({
  id: fc.uuid(),
  title: fc.stringMatching(/^[A-Za-z][A-Za-z0-9 ]{0,48}[A-Za-z0-9]$/).filter(s => s.trim().length > 0),
  description: fc.stringMatching(/^[A-Za-z][A-Za-z0-9 ,.]{0,198}[A-Za-z0-9.]$/).filter(s => s.trim().length > 0),
  type: fc.constantFrom('line', 'bar', 'timeline', 'pie') as fc.Arbitrary<'line' | 'bar' | 'timeline' | 'pie'>,
  data: fc.record({
    labels: fc.array(fc.stringMatching(/^[A-Za-z0-9]{1,20}$/), { minLength: 2, maxLength: 6 }),
    values: fc.array(fc.nat({ max: 100 }), { minLength: 2, maxLength: 6 }),
  }),
}) as fc.Arbitrary<Visualization>

// Route generator
export const validRouteArb = fc.constantFrom(
  '/dashboard',
  '/live',
  '/history',
  '/visuals',
  '/insights',
  '/settings'
)

export const invalidRouteArb = fc.oneof(
  fc.constant('/unknown'),
  fc.constant('/foo/bar'),
  fc.constant('/admin'),
  fc.string({ minLength: 1, maxLength: 20 }).map(s => `/${s}`).filter(s => 
    !['/dashboard', '/live', '/history', '/visuals', '/insights', '/settings', '/'].includes(s)
  ),
)

// Navigation item generator
export const navItemArb = fc.record({
  id: fc.string({ minLength: 1, maxLength: 20 }),
  label: fc.string({ minLength: 1, maxLength: 30 }),
  route: validRouteArb,
})

// Search query generator
export const searchQueryArb = fc.string({ minLength: 0, maxLength: 50 })
