import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import * as fc from 'fast-check'
import SpeakerChip from './SpeakerChip'
import { speakerArb } from '../../test/generators'

afterEach(() => {
  cleanup()
})

/**
 * Property tests for SpeakerChip component
 * Feature: minuteflow-frontend, Property 7: Active Speaker Display
 * Validates: Requirements 4.3
 */
describe('SpeakerChip Properties', () => {
  it('Property 7: For any speaker, name and avatar/initials should be displayed', () => {
    fc.assert(
      fc.property(speakerArb, fc.boolean(), (speaker, isSpeaking) => {
        cleanup() // Clean up before each iteration
        
        render(<SpeakerChip speaker={speaker} isSpeaking={isSpeaking} />)

        // Speaker name should be visible
        expect(screen.getByTestId('speaker-name').textContent).toBe(speaker.name)
        
        // Avatar should show initials (since we don't have avatar URLs in test)
        const avatar = screen.getByTestId('speaker-avatar')
        expect(avatar.textContent).toBe(speaker.initials)
        
        // Avatar should have speaker's color
        expect(avatar).toHaveStyle({ backgroundColor: speaker.color })

        cleanup() // Clean up after each iteration
      }),
      { numRuns: 100 }
    )
  })

  it('Property 7: Speaking indicator should show when speaker is active', () => {
    fc.assert(
      fc.property(speakerArb, (speaker) => {
        cleanup() // Clean up before each iteration
        
        // When speaking
        render(<SpeakerChip speaker={speaker} isSpeaking={true} />)
        expect(screen.getByText('Speaking')).toBeInTheDocument()
        cleanup()

        // When not speaking
        render(<SpeakerChip speaker={speaker} isSpeaking={false} />)
        expect(screen.queryByText('Speaking')).not.toBeInTheDocument()
        cleanup()
      }),
      { numRuns: 100 }
    )
  })
})
