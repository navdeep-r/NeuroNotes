import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { findHighlights, hasHighlightType, getHighlightClass } from './highlighting'
import { 
  contentWithMetricsArb, 
  contentWithDecisionsArb, 
  contentWithActionsArb,
  plainContentArb 
} from '../test/generators'

/**
 * Property tests for content highlighting
 * Feature: minuteflow-frontend, Property 10: Content Highlighting
 * Validates: Requirements 5.5, 6.1, 6.2, 6.3
 */
describe('Content Highlighting Properties', () => {
  it('Property 10: Content with metrics should be highlighted as metrics', () => {
    fc.assert(
      fc.property(contentWithMetricsArb, (content) => {
        const highlights = findHighlights(content)
        // Content with metrics should have at least one metric highlight
        const hasMetric = highlights.some(h => h.type === 'metric')
        expect(hasMetric).toBe(true)
      }),
      { numRuns: 100 }
    )
  })

  it('Property 10: Content with decision phrases should be highlighted as decisions', () => {
    fc.assert(
      fc.property(contentWithDecisionsArb, (content) => {
        const highlights = findHighlights(content)
        // Content with decision phrases should have at least one decision highlight
        const hasDecision = highlights.some(h => h.type === 'decision')
        expect(hasDecision).toBe(true)
      }),
      { numRuns: 100 }
    )
  })

  it('Property 10: Content with action phrases should be highlighted as actions', () => {
    fc.assert(
      fc.property(contentWithActionsArb, (content) => {
        const highlights = findHighlights(content)
        // Content with action phrases should have at least one action highlight
        const hasAction = highlights.some(h => h.type === 'action')
        expect(hasAction).toBe(true)
      }),
      { numRuns: 100 }
    )
  })

  it('Property 10: Each highlight type has a distinct CSS class', () => {
    const types: Array<'metric' | 'decision' | 'action'> = ['metric', 'decision', 'action']
    const classes = types.map(t => getHighlightClass(t))
    
    // All classes should be unique
    const uniqueClasses = new Set(classes)
    expect(uniqueClasses.size).toBe(types.length)
    
    // Each class should be non-empty
    classes.forEach(c => {
      expect(c.length).toBeGreaterThan(0)
    })
  })

  it('Property 10: Highlights should not overlap', () => {
    fc.assert(
      fc.property(
        fc.oneof(contentWithMetricsArb, contentWithDecisionsArb, contentWithActionsArb),
        (content) => {
          const highlights = findHighlights(content)
          
          // Check no overlaps
          for (let i = 0; i < highlights.length - 1; i++) {
            expect(highlights[i].endIndex).toBeLessThanOrEqual(highlights[i + 1].startIndex)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 10: hasHighlightType correctly identifies highlight presence', () => {
    fc.assert(
      fc.property(contentWithMetricsArb, (content) => {
        expect(hasHighlightType(content, 'metric')).toBe(true)
      }),
      { numRuns: 100 }
    )
  })
})
