import { Meeting } from '../../types'
import MeetingItem from './MeetingItem'

interface MeetingListProps {
  meetings: Meeting[]
  activeMeetingId: string | null
  onSelect: (meetingId: string) => void
}

/**
 * MeetingList - Scrollable list of meeting items
 * Implements Requirements 2.4, 3.4 for meeting list display
 */
export default function MeetingList({ meetings, activeMeetingId, onSelect }: MeetingListProps) {
  return (
    <div className="space-y-1" data-testid="meeting-list">
      {meetings.map((meeting) => (
        <MeetingItem
          key={meeting.id}
          meeting={meeting}
          isActive={meeting.id === activeMeetingId}
          onClick={() => onSelect(meeting.id)}
        />
      ))}
    </div>
  )
}
