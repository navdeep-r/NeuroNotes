import { Meeting } from '../../types'
import MeetingItem from './MeetingItem'
import { useAppActions } from '../../context/AppContext'

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
  const { deleteMeeting } = useAppActions()

  const handleDelete = (e: React.MouseEvent, meetingId: string) => {
    e.stopPropagation()
    if (confirm('Are you sure you want to delete this meeting?')) {
      deleteMeeting(meetingId)
    }
  }

  return (
    <div className="space-y-1" data-testid="meeting-list">
      {meetings.map((meeting) => (
        <MeetingItem
          key={meeting.id}
          meeting={meeting}
          isActive={meeting.id === activeMeetingId}
          onClick={() => onSelect(meeting.id)}
          onDelete={(e) => handleDelete(e, meeting.id)}
        />
      ))}
    </div>
  )
}
