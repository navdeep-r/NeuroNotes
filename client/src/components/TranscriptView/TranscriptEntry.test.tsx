import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import * as fc from 'fast-check'
import TranscriptEntry from './TranscriptEntry'
import { speakerArb } from '../../test/generators'
import { TranscriptEntry as TranscriptEntryType } from '../../types'

afterEach(() => {
  cleanup()
})

/**
 * Property tests for TranscriptEntry component
 * Feature: minuteflow-frontend, Property 9: Transcript Entry Rendering
 * Validates: Requirements 5.1
 */
describe('TranscriptEntry Properties', () => {
  it('Property 9: For any transcript entry, speaker name, timestamp, and content should be visible', () => {
    fc.assert(
      fc.property(
        speakerArb,
        fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
        fc.date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') }),
        (speaker, content, timestamp) => {
          cleanup() // Clean up before each iteration
          
          const entry: TranscriptEntryType = {
            id: 'test-entry',
            speakerId: speaker.id,
            speaker,
            timestamp,
            content,
          }

          render(<TranscriptEntry entry={entry} />)

          // Speaker name should be visible
          expect(screen.getByTestId('entry-speaker').textContent).toBe(speaker.name)
          
          // Timestamp should be visible (formatted)
          const timestampEl = screen.getByTestId('entry-timestamp')
          expect(timestampEl).toBeInTheDocument()
          
          // Content should be visible
          const contentEl = screen.getByTestId('entry-content')
          expect(contentEl).toBeInTheDocument()
          
          // Avatar should show initials
          const avatarEl = screen.getByTestId('entry-avatar')
          expect(avatarEl).toHaveTextContent(speaker.initials)

          cleanup() // Clean up after each iteration
        }
      ),
      { numRuns: 100 }
    )
  })
})
