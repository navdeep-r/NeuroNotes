import { Speaker } from '../../types'

interface SpeakerChipProps {
  speaker: Speaker
  isSpeaking: boolean
}

/**
 * SpeakerChip - Displays active speaker with avatar/initials
 * Implements Requirement 4.3 for speaker display
 */
export default function SpeakerChip({ speaker, isSpeaking }: SpeakerChipProps) {
  return (
    <div 
      className="flex items-center gap-2 px-3 py-1.5 bg-dark-600/50 rounded-full"
      data-testid="speaker-chip"
    >
      {/* Avatar or initials */}
      <div 
        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold text-white"
        style={{ backgroundColor: speaker.color }}
        data-testid="speaker-avatar"
      >
        {speaker.avatar ? (
          <img 
            src={speaker.avatar} 
            alt={speaker.name} 
            className="w-full h-full rounded-full object-cover"
          />
        ) : (
          speaker.initials
        )}
      </div>

      {/* Speaker name and status */}
      <div className="flex flex-col">
        <span className="text-sm font-medium text-white" data-testid="speaker-name">
          {speaker.name}
        </span>
        {isSpeaking && (
          <span className="text-xs text-accent-primary">Speaking</span>
        )}
      </div>
    </div>
  )
}
