import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react'
import * as fc from 'fast-check'
import MeetingItem from './MeetingItem'
import { meetingArb } from '../../test/generators'

afterEach(() => {
  cleanup()
})

/**
 * Property tests for MeetingItem component
 * Feature: minuteflow-frontend, Property 4: Meeting Item Rendering
 * Validates: Requirements 3.1, 3.2
 */
describe('MeetingItem Properties', () => {
  it('Property 4: For any meeting, name and status indicator should be displayed', () => {
    fc.assert(
      fc.property(meetingArb, fc.boolean(), (meeting, isActive) => {
        cleanup() // Clean up before each iteration
        
        const onClick = vi.fn()
        render(
          <MeetingItem meeting={meeting} isActive={isActive} onClick={onClick} />
        )

        const item = screen.getByTestId(`meeting-item-${meeting.id}`)
        
        // Meeting name should be visible
        expect(within(item).getByTestId('meeting-name').textContent).toBe(meeting.title)
        
        // Status indicator should be present
        if (meeting.status === 'live') {
          expect(within(item).getByTestId('status-live')).toBeInTheDocument()
        } else {
          expect(within(item).getByTestId('status-completed')).toBeInTheDocument()
        }

        cleanup() // Clean up after each iteration
      }),
      { numRuns: 100 }
    )
  })

  it('Property 3: Clicking a meeting item should trigger selection', () => {
    fc.assert(
      fc.property(meetingArb, (meeting) => {
        cleanup() // Clean up before each iteration
        
        const onClick = vi.fn()
        render(
          <MeetingItem meeting={meeting} isActive={false} onClick={onClick} />
        )

        const button = screen.getByTestId(`meeting-item-${meeting.id}`)
        fireEvent.click(button)
        
        expect(onClick).toHaveBeenCalledTimes(1)

        cleanup() // Clean up after each iteration
      }),
      { numRuns: 100 }
    )
  })

  it('Property 5: Active meeting should have active styling', () => {
    fc.assert(
      fc.property(meetingArb, (meeting) => {
        cleanup() // Clean up before each iteration
        
        const onClick = vi.fn()
        
        // Render as active
        render(
          <MeetingItem meeting={meeting} isActive={true} onClick={onClick} />
        )
        const activeButton = screen.getByTestId(`meeting-item-${meeting.id}`)
        expect(activeButton).toHaveAttribute('data-active', 'true')
        cleanup()

        // Render as inactive
        render(
          <MeetingItem meeting={meeting} isActive={false} onClick={onClick} />
        )
        const inactiveButton = screen.getByTestId(`meeting-item-${meeting.id}`)
        expect(inactiveButton).toHaveAttribute('data-active', 'false')
        cleanup()
      }),
      { numRuns: 100 }
    )
  })
})
