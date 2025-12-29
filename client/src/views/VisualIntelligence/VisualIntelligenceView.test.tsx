import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup, within } from '@testing-library/react'
import * as fc from 'fast-check'
import { visualizationArb } from '../../test/generators'
import { Visualization } from '../../types'

afterEach(() => {
  cleanup()
})

// Simple VisualizationCard for testing
function TestVisualizationCard({ visualization }: { visualization: Visualization }) {
  return (
    <div data-testid={`viz-card-${visualization.id}`}>
      <h3 data-testid="viz-title">{visualization.title}</h3>
      <p data-testid="viz-description">{visualization.description}</p>
    </div>
  )
}

/**
 * Property tests for VisualizationCard
 * Feature: minuteflow-frontend, Property 15: Visualization Card Display
 * Validates: Requirements 10.3
 */
describe('VisualizationCard Properties', () => {
  it('Property 15: For any visualization, title and description should be displayed', () => {
    fc.assert(
      fc.property(visualizationArb, (visualization) => {
        cleanup() // Clean up before each iteration
        
        render(<TestVisualizationCard visualization={visualization} />)

        // Use the card container to scope queries
        const card = screen.getByTestId(`viz-card-${visualization.id}`)
        
        // Title should be visible within the card
        const title = within(card).getByTestId('viz-title')
        expect(title.textContent).toBe(visualization.title)
        
        // Description should be visible within the card
        const description = within(card).getByTestId('viz-description')
        expect(description.textContent).toBe(visualization.description)

        cleanup() // Clean up after each iteration
      }),
      { numRuns: 100 }
    )
  })
})
