import { useState } from 'react'
import { Meeting } from '../../types'
import MeetingItem from './MeetingItem'
import { useAppActions } from '../../context/AppContext'
import ConfirmationModal from '../Modals/ConfirmationModal'
import VoiceSessionModal from '../Modals/VoiceSessionModal'

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
  const [deleteModalState, setDeleteModalState] = useState<{ isOpen: boolean; meetingId: string | null }>({
    isOpen: false,
    meetingId: null
  })

  const [voiceModalState, setVoiceModalState] = useState<{ isOpen: boolean; meetingId: string | null; meetingTitle: string }>({
    isOpen: false,
    meetingId: null,
    meetingTitle: ''
  })

  const handleVoice = (e: React.MouseEvent, meetingId: string, title: string) => {
    e.stopPropagation()
    setVoiceModalState({ isOpen: true, meetingId, meetingTitle: title })
  }

  const handleDelete = (e: React.MouseEvent, meetingId: string) => {
    e.stopPropagation()
    setDeleteModalState({ isOpen: true, meetingId })
  }

  const handleConfirmDelete = () => {
    if (deleteModalState.meetingId) {
      deleteMeeting(deleteModalState.meetingId)
      setDeleteModalState({ isOpen: false, meetingId: null })
    }
  }

  return (
    <div className="space-y-1" data-testid="meeting-list">
      <ConfirmationModal
        isOpen={deleteModalState.isOpen}
        onClose={() => setDeleteModalState({ isOpen: false, meetingId: null })}
        onConfirm={handleConfirmDelete}
        title="Delete Meeting?"
        message="Are you sure you want to delete this meeting? This action cannot be undone."
        confirmText="Delete Meeting"
        variant="danger"
      />
      <VoiceSessionModal
        isOpen={voiceModalState.isOpen}
        onClose={() => setVoiceModalState({ ...voiceModalState, isOpen: false })}
        meetingId={voiceModalState.meetingId || ''}
        meetingTitle={voiceModalState.meetingTitle}
      />
      {meetings.map((meeting) => (
        <MeetingItem
          key={meeting.id}
          meeting={meeting}
          isActive={meeting.id === activeMeetingId}
          onClick={() => onSelect(meeting.id)}
          onDelete={(e) => handleDelete(e, meeting.id)}
          onVoiceMode={(e) => handleVoice(e, meeting.id, meeting.title)}
        />
      ))}
    </div>
  )
}
