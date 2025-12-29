import { useAppState, useAppActions } from '../../context/AppContext'
import TranscriptView from '../../components/TranscriptView/TranscriptView'

/**
 * LiveMeetingView - Main view for live meeting transcript
 * Implements Requirements 5.1-5.5 for live transcript display
 */
export default function LiveMeetingView() {
  const { meetings, activeMeetingId, autoScrollEnabled } = useAppState()
  const { setAutoScroll } = useAppActions()

  const activeMeeting = meetings.find(m => m.id === activeMeetingId)
  const transcript = activeMeeting?.transcript || []

  const handleScrollStateChange = (isAtBottom: boolean) => {
    setAutoScroll(isAtBottom)
  }

  if (!activeMeeting) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 text-lg">No meeting selected</p>
          <p className="text-gray-500 text-sm mt-2">Select a meeting from the sidebar to view its transcript</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Transcript area */}
      <div className="flex-1 overflow-hidden">
        <TranscriptView
          entries={transcript}
          autoScroll={autoScrollEnabled}
          onScrollStateChange={handleScrollStateChange}
        />
      </div>

      {/* Auto-scroll indicator */}
      {!autoScrollEnabled && (
        <div className="px-4 py-2 bg-dark-700/50 border-t border-white/5">
          <button
            onClick={() => setAutoScroll(true)}
            className="text-sm text-accent-primary hover:text-accent-primary/80 transition-smooth"
          >
            ↓ Scroll to latest
          </button>
        </div>
      )}
    </div>
  )
}
