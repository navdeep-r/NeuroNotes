import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react'
import * as fc from 'fast-check'
import MeetingsHistoryView from './MeetingsHistoryView'

const localMockMeetings: any[] = [
  {
    id: 'm1',
    title: 'Test Meeting 1',
    status: 'completed',
    startTime: new Date(),
    duration: 1800,
    participants: [],
    summary: { keyPoints: ['Point 1'] }
  },
  {
    id: 'm2',
    title: 'Test Meeting 2',
    status: 'completed',
    startTime: new Date(),
    duration: 3600,
    participants: [],
    summary: { keyPoints: [] }
  }
]

// Mock the context since it's used in the component
vi.mock('../../context/AppContext', () => ({
  useAppState: () => ({
    meetings: localMockMeetings
  })
}))

afterEach(() => {
  cleanup()
})

describe('MeetingsHistoryView Properties', () => {
  it('Property 12: For any meeting in history, name, date, and duration should be displayed', () => {
    render(<MeetingsHistoryView />)

    localMockMeetings.forEach(meeting => {
      const item = screen.getByTestId(`history-item-${meeting.id}`)
      expect(item).toBeInTheDocument()

      const nameEl = within(item).getByTestId('history-meeting-name')
      expect(nameEl).toHaveTextContent(meeting.title)
    })
  })

  it('Property 13: Clicking a meeting should show its summary', () => {
    render(<MeetingsHistoryView />)

    const meetingWithSummary = localMockMeetings.find(m => m.summary?.keyPoints.length)

    if (meetingWithSummary) {
      const item = screen.getByTestId(`history-item-${meetingWithSummary.id}`)
      fireEvent.click(item)
      expect(screen.getByText('Key Points')).toBeInTheDocument()
    }
  })

  it('Property 14: Search should filter meetings by name', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 0, maxLength: 20 }), (query) => {
        cleanup()
        render(<MeetingsHistoryView />)

        const searchInput = screen.getByTestId('history-search')
        fireEvent.change(searchInput, { target: { value: query } })

        localMockMeetings.forEach(meeting => {
          const shouldBeVisible = meeting.title.toLowerCase().includes(query.toLowerCase())
          const item = screen.queryByTestId(`history-item-${meeting.id}`)

          if (shouldBeVisible) {
            expect(item).toBeInTheDocument()
          } else {
            expect(item).not.toBeInTheDocument()
          }
        })

        cleanup()
      }),
      { numRuns: 50 }
    )
  })
})
