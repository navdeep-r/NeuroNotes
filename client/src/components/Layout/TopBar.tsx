import { useAppState } from '../../context/AppContext'
import LiveIndicator from '../LiveIndicator/LiveIndicator'
import MeetingTimer from '../MeetingTimer/MeetingTimer'
import SpeakerChip from '../SpeakerChip/SpeakerChip'

/**
 * TopBar - Contextual header showing live meeting status
 * Implements Requirements 4.1-4.5 for live context display
 */
export default function TopBar() {
  const { meetings, activeMeetingId, isLive, elapsedTime, activeSpeakerId } = useAppState()

  const activeMeeting = meetings.find(m => m.id === activeMeetingId)
  const activeSpeaker = activeMeeting?.participants.find(p => p.id === activeSpeakerId)

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

      {/* Right section - Active speaker */}
      <div className="flex items-center gap-4">
        {activeSpeaker && isLive && (
          <SpeakerChip speaker={activeSpeaker} isSpeaking={true} />
        )}
      </div>
    </div>
  )
}
