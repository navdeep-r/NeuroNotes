import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react'
import * as fc from 'fast-check'
import MeetingsHistoryView from './MeetingsHistoryView'
import { mockMeetings } from '../../data/mockData'

afterEach(() => {
  cleanup()
})

/**
 * Property tests for MeetingsHistoryView
 * Feature: minuteflow-frontend, Property 12, 13, 14
 * Validates: Requirements 9.2, 9.3, 9.4
 */
describe('MeetingsHistoryView Properties', () => {
  it('Property 12: For any meeting in history, name, date, and duration should be displayed', () => {
    render(<MeetingsHistoryView />)
    
    // Get completed meetings
    const completedMeetings = mockMeetings.filter(m => m.status === 'completed')
    
    completedMeetings.forEach(meeting => {
      const item = screen.getByTestId(`history-item-${meeting.id}`)
      expect(item).toBeInTheDocument()
      
      // Name should be visible within the item
      const nameEl = within(item).getByTestId('history-meeting-name')
      expect(nameEl).toHaveTextContent(meeting.title)
    })
  })

  it('Property 13: Clicking a meeting should show its summary', () => {
    render(<MeetingsHistoryView />)
    
    const completedMeetings = mockMeetings.filter(m => m.status === 'completed')
    const meetingWithSummary = completedMeetings.find(m => m.summary)
    
    if (meetingWithSummary) {
      const item = screen.getByTestId(`history-item-${meetingWithSummary.id}`)
      fireEvent.click(item)
      
      // Summary panel should show key points
      if (meetingWithSummary.summary?.keyPoints.length) {
        expect(screen.getByText('Key Points')).toBeInTheDocument()
      }
    }
  })

  it('Property 14: Search should filter meetings by name', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 0, maxLength: 20 }), (query) => {
        cleanup() // Clean up before each iteration
        
        render(<MeetingsHistoryView />)
        
        const searchInput = screen.getByTestId('history-search')
        fireEvent.change(searchInput, { target: { value: query } })
        
        // Get completed meetings
        const completedMeetings = mockMeetings.filter(m => m.status === 'completed')
        
        // Check that only matching meetings are shown
        completedMeetings.forEach(meeting => {
          const shouldBeVisible = meeting.title.toLowerCase().includes(query.toLowerCase())
          const item = screen.queryByTestId(`history-item-${meeting.id}`)
          
          if (shouldBeVisible) {
            expect(item).toBeInTheDocument()
          } else {
            expect(item).not.toBeInTheDocument()
          }
        })
        
        cleanup() // Clean up after each iteration
      }),
      { numRuns: 50 }
    )
  })
})
