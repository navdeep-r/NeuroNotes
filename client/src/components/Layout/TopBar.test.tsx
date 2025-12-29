import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { AppProvider } from '../../context/AppContext'
import TopBar from './TopBar'

/**
 * Tests for TopBar component
 * Feature: minuteflow-frontend, Property 6, 7, 8
 * Validates: Requirements 4.1, 4.3, 4.4
 */
describe('TopBar', () => {
  const renderTopBar = () => {
    return render(
      <BrowserRouter>
        <AppProvider>
          <TopBar />
        </AppProvider>
      </BrowserRouter>
    )
  }

  it('Property 6: Should display LIVE indicator when meeting is live', () => {
    renderTopBar()
    
    // Default state has a live meeting selected
    expect(screen.getByTestId('live-indicator')).toBeInTheDocument()
  })

  it('Property 8: Should display meeting title', () => {
    renderTopBar()
    
    // Default meeting is "Sales Strategy Sync"
    expect(screen.getByTestId('meeting-title')).toHaveTextContent('Sales Strategy Sync')
  })

  it('Property 7: Should display active speaker chip', () => {
    renderTopBar()
    
    // Should have speaker chip
    expect(screen.getByTestId('speaker-chip')).toBeInTheDocument()
  })

  it('Should display meeting timer', () => {
    renderTopBar()
    
    expect(screen.getByTestId('meeting-timer')).toBeInTheDocument()
  })
})
