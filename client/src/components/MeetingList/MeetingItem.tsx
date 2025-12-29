import { Meeting } from '../../types'

interface MeetingItemProps {
  meeting: Meeting
  isActive: boolean
  onClick: () => void
}

/**
 * MeetingItem - Individual meeting item in the sidebar list
 * Implements Requirements 3.1-3.3 for meeting item display
 */
export default function MeetingItem({ meeting, isActive, onClick }: MeetingItemProps) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-smooth text-left
        ${isActive 
          ? 'bg-accent-primary/20 text-white' 
          : 'text-gray-400 hover:bg-white/5 hover:text-white'
        }
      `}
      data-testid={`meeting-item-${meeting.id}`}
      data-active={isActive}
    >
      {/* Status indicator */}
      <div className="flex-shrink-0">
        {meeting.status === 'live' ? (
          <span className="relative flex h-2.5 w-2.5" data-testid="status-live">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
          </span>
        ) : (
          <span 
            className="inline-flex rounded-full h-2.5 w-2.5 bg-gray-500"
            data-testid="status-completed"
          />
        )}
      </div>

      {/* Meeting name */}
      <span className="text-sm font-medium truncate" data-testid="meeting-name">
        {meeting.title}
      </span>
    </button>
  )
}
