import { useState } from 'react'
import { Search, Calendar, Clock, Users } from 'lucide-react'
import { mockMeetings } from '../../data/mockData'
import { Meeting } from '../../types'

/**
 * MeetingsHistoryView - Browse and search past meetings
 * Implements Requirements 9.1-9.4 for meeting history
 */
export default function MeetingsHistoryView() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null)

  // Filter completed meetings
  const completedMeetings = mockMeetings.filter(m => m.status === 'completed')
  
  // Apply search filter
  const filteredMeetings = completedMeetings.filter(m =>
    m.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatDuration = (seconds?: number): string => {
    if (!seconds) return 'N/A'
    const mins = Math.floor(seconds / 60)
    return `${mins} min`
  }

  return (
    <div className="h-full flex">
      {/* Meeting list */}
      <div className="w-1/2 border-r border-white/5 flex flex-col">
        {/* Search */}
        <div className="p-4 border-b border-white/5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search meetings..."
              className="w-full bg-dark-700/50 border border-white/10 rounded-lg pl-10 pr-4 py-2.5
                         text-white placeholder-gray-500 focus:outline-none focus:border-accent-primary/50
                         transition-smooth"
              data-testid="history-search"
            />
          </div>
        </div>

        {/* Meeting list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filteredMeetings.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No meetings found</p>
          ) : (
            filteredMeetings.map((meeting) => (
              <button
                key={meeting.id}
                onClick={() => setSelectedMeeting(meeting)}
                className={`w-full text-left p-4 rounded-lg transition-smooth ${
                  selectedMeeting?.id === meeting.id
                    ? 'bg-accent-primary/20 border border-accent-primary/30'
                    : 'bg-dark-700/30 hover:bg-dark-700/50 border border-transparent'
                }`}
                data-testid={`history-item-${meeting.id}`}
              >
                <h3 
                  className="font-medium text-white"
                  data-testid="history-meeting-name"
                >
                  {meeting.title}
                </h3>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
                  <span className="flex items-center gap-1" data-testid="history-meeting-date">
                    <Calendar className="w-3.5 h-3.5" />
                    {formatDate(meeting.startTime)}
                  </span>
                  <span className="flex items-center gap-1" data-testid="history-meeting-duration">
                    <Clock className="w-3.5 h-3.5" />
                    {formatDuration(meeting.duration)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    {meeting.participants.length}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Meeting summary panel */}
      <div className="w-1/2 p-6 overflow-y-auto">
        {selectedMeeting ? (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white">{selectedMeeting.title}</h2>
              <p className="text-gray-400 mt-1">{formatDate(selectedMeeting.startTime)}</p>
            </div>

            {selectedMeeting.summary && (
              <>
                {/* Key Points */}
                <div className="glass-card p-4">
                  <h3 className="font-semibold text-white mb-3">Key Points</h3>
                  <ul className="space-y-2">
                    {selectedMeeting.summary.keyPoints.map((point, i) => (
                      <li key={i} className="flex items-start gap-2 text-gray-300 text-sm">
                        <span className="text-accent-primary mt-1">•</span>
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Decisions */}
                <div className="glass-card p-4">
                  <h3 className="font-semibold text-white mb-3">Decisions</h3>
                  <ul className="space-y-2">
                    {selectedMeeting.summary.decisions.map((decision) => (
                      <li key={decision.id} className="flex items-start gap-2 text-gray-300 text-sm">
                        <span className="text-highlight-decision mt-1">✓</span>
                        {decision.content}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Action Items */}
                <div className="glass-card p-4">
                  <h3 className="font-semibold text-white mb-3">Action Items</h3>
                  <ul className="space-y-2">
                    {selectedMeeting.summary.actionItems.map((action) => (
                      <li key={action.id} className="flex items-center justify-between text-sm">
                        <span className="text-gray-300">{action.content}</span>
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          action.status === 'completed' ? 'bg-accent-success/20 text-accent-success' :
                          action.status === 'in_progress' ? 'bg-accent-warning/20 text-accent-warning' :
                          'bg-gray-500/20 text-gray-400'
                        }`}>
                          {action.status.replace('_', ' ')}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-500">
            <p>Select a meeting to view its summary</p>
          </div>
        )}
      </div>
    </div>
  )
}
