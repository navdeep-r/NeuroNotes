import { useEffect, useRef, useCallback } from 'react'
import { TranscriptEntry as TranscriptEntryType } from '../../types'
import TranscriptEntry from './TranscriptEntry'

interface TranscriptViewProps {
  entries: TranscriptEntryType[]
  autoScroll: boolean
  onScrollStateChange: (isAtBottom: boolean) => void
}

/**
 * TranscriptView - Scrollable transcript with auto-scroll behavior
 * Implements Requirements 5.1-5.5 for transcript display
 */
export default function TranscriptView({ entries, autoScroll, onScrollStateChange }: TranscriptViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const isUserScrolling = useRef(false)

  // Check if scrolled to bottom
  const isAtBottom = useCallback(() => {
    const container = containerRef.current
    if (!container) return true
    const threshold = 50 // pixels from bottom
    return container.scrollHeight - container.scrollTop - container.clientHeight < threshold
  }, [])

  // Handle scroll events
  const handleScroll = useCallback(() => {
    if (isUserScrolling.current) {
      onScrollStateChange(isAtBottom())
    }
  }, [isAtBottom, onScrollStateChange])

  // Track user scroll intent
  const handleWheel = useCallback(() => {
    isUserScrolling.current = true
    // Reset after a short delay
    setTimeout(() => {
      isUserScrolling.current = false
    }, 150)
  }, [])

  // Auto-scroll to bottom when new entries arrive
  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [entries, autoScroll])

  if (entries.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        <p>Waiting for transcript...</p>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="h-full overflow-y-auto px-4 py-2 space-y-1"
      onScroll={handleScroll}
      onWheel={handleWheel}
      data-testid="transcript-view"
    >
      {entries.map((entry) => (
        <TranscriptEntry key={entry.id} entry={entry} />
      ))}
    </div>
  )
}
