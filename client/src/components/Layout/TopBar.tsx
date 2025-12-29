import { useApp } from '../../context/AppContext'
import LiveIndicator from '../LiveIndicator/LiveIndicator'
import MeetingTimer from '../MeetingTimer/MeetingTimer'
import SpeakerChip from '../SpeakerChip/SpeakerChip'

/**
 * TopBar - Contextual header showing live meeting status
 * Implements Requirements 4.1-4.5 for live context display
 */
export default function TopBar() {
  const [state, actions] = useApp()
  const { meetings, activeMeetingId, isLive, elapsedTime, activeSpeakerId } = state

  const activeMeeting = meetings.find(m => m.id === activeMeetingId)
  const activeSpeaker = activeMeeting?.participants.find(p => p.id === activeSpeakerId)

  const handleStopAnalysis = () => {
    if (activeMeetingId) {
      if (confirm('Are you sure you want to stop the meeting analysis? This will end the live session.')) {
        actions.endMeeting(activeMeetingId)
      }
    }
  }

  return (
    <div className="h-full flex items-center justify-between px-6">
      {/* Left section - Live indicator and timer */}
      <div className="flex items-center gap-4">
        {isLive && <LiveIndicator />}
        {isLive && <MeetingTimer elapsedTime={elapsedTime} />}
      </div>

      {/* Center section - Meeting title */}
      <div className="flex-1 text-center">
        {activeMeeting && (
          <h1 className="text-lg font-semibold text-white" data-testid="meeting-title">
            {activeMeeting.title}
          </h1>
        )}
      </div>

      {/* Right section - Active speaker & Controls */}
      <div className="flex items-center gap-4">
        {activeSpeaker && isLive && (
          <SpeakerChip speaker={activeSpeaker} isSpeaking={true} />
        )}

        {isLive && (
          <button
            onClick={handleStopAnalysis}
            className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-xs font-medium rounded-full border border-red-500/20 transition-all flex items-center gap-2"
          >
            <div className="w-2 h-2 bg-red-500 rounded-sm" />
            Stop Analysis
          </button>
        )}
      </div>
    </div>
  )
}
