import { Meeting } from '../../types'

import { Trash2, Mic } from 'lucide-react'

interface MeetingItemProps {
  meeting: Meeting
  isActive: boolean
  onClick: () => void
  onDelete: (e: React.MouseEvent) => void
  onVoiceMode: (e: React.MouseEvent) => void
}

/**
 * MeetingItem - Individual meeting item in the sidebar list
 * Implements Requirements 3.1-3.3 for meeting item display
 */
export default function MeetingItem({ meeting, isActive, onClick, onDelete, onVoiceMode }: MeetingItemProps) {
  return (
    <div
      onClick={onClick}
      className={`
        w-full group flex items-center justify-between px-3 py-2.5 rounded-lg transition-smooth cursor-pointer
        ${isActive
          ? 'bg-accent-primary/20 text-white'
          : 'text-gray-400 hover:bg-white/5 hover:text-white'
        }
      `}
      data-testid={`meeting-item-${meeting.id}`}
      data-active={isActive}
    >
      <div className="flex items-center gap-3 overflow-hidden">
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
      </div>

      <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
        {/* Voice Mode Button */}
        <button
          onClick={onVoiceMode}
          className={`p-1.5 rounded-md hover:bg-accent-primary/20 hover:text-accent-primary text-gray-500 transition-colors mr-1 ${isActive ? 'text-white/50 hover:text-white' : ''}`}
          title="Start Voice Session"
        >
          <Mic className="w-3.5 h-3.5" />
        </button>

        {/* Delete Button */}
        <button
          onClick={onDelete}
          className={`p-1.5 rounded-md hover:bg-red-500/20 hover:text-red-500 text-gray-500 transition-colors ${isActive ? 'text-white/50 hover:text-white' : ''}`}
          title="Delete meeting"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
