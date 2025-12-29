import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import LiveIndicator from './LiveIndicator'

/**
 * Tests for LiveIndicator component
 * Feature: minuteflow-frontend, Property 6: Live Meeting Indicator Display
 * Validates: Requirements 4.1
 */
describe('LiveIndicator', () => {
  it('Property 6: Live indicator should display LIVE text', () => {
    render(<LiveIndicator />)
    
    expect(screen.getByTestId('live-indicator')).toBeInTheDocument()
    expect(screen.getByText(/live/i)).toBeInTheDocument()
  })

  it('Property 6: Live indicator should have pulsing animation class', () => {
    render(<LiveIndicator />)
    
    const indicator = screen.getByTestId('live-indicator')
    // Check for animation-related elements
    const pulsingElement = indicator.querySelector('.animate-ping')
    expect(pulsingElement).toBeInTheDocument()
  })
})
