import { useState, useEffect } from 'react'
import { Search, Calendar, Clock, Users, ChevronRight, FileText, Loader2, Sparkles, Mic } from 'lucide-react'
import { formatDate, formatDuration } from '../../utils/formatters'
import { Meeting } from '../../types'
import VoiceSessionModal from '../../components/Modals/VoiceSessionModal'
import { useAppState } from '../../context/AppContext'

/**
 * MeetingsHistoryView - Browse and search past meetings
 * Implements Requirements 9.1-9.4 for meeting history
 */
export default function MeetingsHistoryView() {
  const { meetings } = useAppState()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false)

  // Filter completed meetings from real state
  const completedMeetings = meetings.filter(m => m.status === 'completed')

  // Apply search filter
  const filteredMeetings = completedMeetings.filter(m =>
    m.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Fetch summary data when a meeting is selected
  useEffect(() => {
    if (!selectedMeeting?.id) return
    console.log('[History] Selected meeting:', selectedMeeting.title, 'ID:', selectedMeeting.id)
    console.log('[History] Has summary?', selectedMeeting.summary)

    const fetchArtifacts = async () => {
      try {
        console.log('[History] Fetching artifacts...')
        const res = await fetch(`http://localhost:5000/api/meetings/${selectedMeeting.id}/artifacts`)
        const data = await res.json()
        console.log('[History] Artifacts response:', data)

        const hasArtifacts = (data.decisions && data.decisions.length > 0) || (data.actions && data.actions.length > 0)

        if (hasArtifacts) {
          console.log('[History] Found artifacts, updating state.')
          // Merge artifacts into the selected meeting object for display
          setSelectedMeeting(prev => prev ? ({
            ...prev,
            summary: {
              keyPoints: [], // We might need to generate these or fetch/store them separately if not in artifacts
              decisions: data.decisions || [],
              actionItems: data.actions || [],
              opportunities: [],
              risks: [],
              eligibility: [],
              questions: []
            }
          }) : null)
        } else {
          // 2. If no artifacts, generate summary on the fly
          console.log('[History] No artifacts found. Generating summary...')
          setIsGenerating(true)
          const genRes = await fetch(`http://localhost:5000/api/meetings/${selectedMeeting.id}/generate-summary`, {
            method: 'POST'
          })
          const genData = await genRes.json()
          console.log('[History] Generation result:', genRes.status, genData)

          if (genRes.ok) {
            setSelectedMeeting(prev => prev ? ({
              ...prev,
              summary: {
                keyPoints: genData.keyPoints || [],
                decisions: genData.decisions || [],
                actionItems: genData.actionItems || [],
                opportunities: genData.opportunities || [],
                risks: genData.risks || [],
                eligibility: genData.eligibility || [],
                questions: genData.questions || []
              }
            }) : null)
          }
        }

      } catch (err) {
        console.error('Failed to fetch meeting artifacts:', err)
      } finally {
        setIsGenerating(false)
      }
    }

    // Only fetch if summary is empty to avoid overwriting or infinite loops if we check structure
    // But since we just set selectedMeeting from the list (which likely has empty summary), we should fetch.
    if (!selectedMeeting.summary || (!selectedMeeting.summary.decisions?.length && !selectedMeeting.summary.actionItems?.length)) {
      console.log('[History] Summary empty, triggering fetchArtifacts...')
      fetchArtifacts()
    } else {
      console.log('[History] Summary exists, skipping.')
    }
  }, [selectedMeeting?.id])

  return (
    <div className="h-full flex bg-dark-950">
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
                className={`w-full text-left p-4 rounded-lg transition-smooth ${selectedMeeting?.id === meeting.id
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
      <div className="w-1/2 p-6 overflow-y-auto relative">
        {selectedMeeting ? (
          <div className="space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">{selectedMeeting.title}</h2>
                <p className="text-gray-400 mt-1">{formatDate(selectedMeeting.startTime)}</p>
              </div>

              <button
                onClick={() => setIsVoiceModalOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-accent-primary/10 hover:bg-accent-primary/20 text-accent-primary rounded-full transition-colors border border-accent-primary/20"
              >
                <Mic className="w-4 h-4" />
                <span className="text-sm font-medium">Voice Mode</span>
              </button>
            </div>

            {/* Render Modal */}
            <VoiceSessionModal
              isOpen={isVoiceModalOpen}
              onClose={() => setIsVoiceModalOpen(false)}
              meetingId={selectedMeeting.id}
              meetingTitle={selectedMeeting.title}
            />

            {/* Loading State */}
            {isGenerating && (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400 animate-in fade-in">
                <Loader2 className="w-8 h-8 animate-spin mb-3 text-accent-primary" />
                <p>Generating summary from transcript...</p>
              </div>
            )}

            {!isGenerating && selectedMeeting.summary && (
              <>
                {/* Key Points - Only show if we have them */}
                {selectedMeeting.summary.keyPoints && selectedMeeting.summary.keyPoints.length > 0 && (
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
                )}

                {/* Opportunities */}
                {selectedMeeting.summary.opportunities && selectedMeeting.summary.opportunities.length > 0 && (
                  <div className="glass-card p-4 border-l-4 border-l-accent-primary">
                    <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                      ✨ Opportunities & Benefits
                    </h3>
                    <ul className="space-y-2">
                      {selectedMeeting.summary.opportunities.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-gray-300 text-sm">
                          <span className="text-accent-primary mt-1">→</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Risks */}
                {selectedMeeting.summary.risks && selectedMeeting.summary.risks.length > 0 && (
                  <div className="glass-card p-4 border-l-4 border-l-accent-warning">
                    <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                      ⚠️ Risks & Trade-offs
                    </h3>
                    <ul className="space-y-2">
                      {selectedMeeting.summary.risks.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-gray-300 text-sm">
                          <span className="text-accent-warning mt-1">!</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Eligibility */}
                {selectedMeeting.summary.eligibility && selectedMeeting.summary.eligibility.length > 0 && (
                  <div className="glass-card p-4 border-l-4 border-l-blue-400">
                    <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                      📋 Eligibility & Requirements
                    </h3>
                    <ul className="space-y-2">
                      {selectedMeeting.summary.eligibility.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-gray-300 text-sm">
                          <span className="text-blue-400 mt-1">check</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Questions */}
                {selectedMeeting.summary.questions && selectedMeeting.summary.questions.length > 0 && (
                  <div className="glass-card p-4 border-l-4 border-l-purple-400">
                    <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                      ❓ Open Questions
                    </h3>
                    <ul className="space-y-2">
                      {selectedMeeting.summary.questions.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-gray-300 text-sm">
                          <span className="text-purple-400 mt-1">?</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Decisions */}
                {selectedMeeting.summary.decisions && selectedMeeting.summary.decisions.length > 0 && (
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
                )}

                {/* Action Items */}
                {selectedMeeting.summary.actionItems && selectedMeeting.summary.actionItems.length > 0 && (
                  <div className="glass-card p-4">
                    <h3 className="font-semibold text-white mb-3">Action Items</h3>
                    <ul className="space-y-2">
                      {selectedMeeting.summary.actionItems.map((action) => (
                        <li key={action.id} className="flex items-center justify-between text-sm">
                          <span className="text-gray-300">{action.content}</span>
                          <span className={`px-2 py-0.5 rounded text-xs ${action.status === 'completed' ? 'bg-accent-success/20 text-accent-success' :
                            action.status === 'in_progress' ? 'bg-accent-warning/20 text-accent-warning' :
                              'bg-gray-500/20 text-gray-400'
                            }`}>
                            {action.status.replace('_', ' ')}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}

            {/* Empty state if summary exists but is empty */}
            {selectedMeeting.summary &&
              (!selectedMeeting.summary.keyPoints?.length &&
                !selectedMeeting.summary.decisions?.length &&
                !selectedMeeting.summary.actionItems?.length &&
                !selectedMeeting.summary.opportunities?.length &&
                !selectedMeeting.summary.risks?.length &&
                !selectedMeeting.summary.eligibility?.length &&
                !selectedMeeting.summary.questions?.length
              ) && (
                <div className="text-gray-500 text-center py-10 flex flex-col items-center gap-4">
                  <p>No summary data available for this meeting yet.</p>
                  <button
                    onClick={async () => {
                      setIsGenerating(true)
                      try {
                        const genRes = await fetch(`http://localhost:5000/api/meetings/${selectedMeeting.id}/generate-summary`, {
                          method: 'POST'
                        })
                        const genData = await genRes.json()
                        if (genRes.ok) {
                          setSelectedMeeting(prev => prev ? ({
                            ...prev,
                            summary: {
                              keyPoints: genData.keyPoints || [],
                              decisions: genData.decisions || [],
                              actionItems: genData.actionItems || [],
                              opportunities: genData.opportunities || [],
                              risks: genData.risks || [],
                              eligibility: genData.eligibility || [],
                              questions: genData.questions || []
                            }
                          }) : null)
                        }
                      } catch (err) {
                        console.error('Manual generation failed:', err)
                      } finally {
                        setIsGenerating(false)
                      }
                    }}
                    disabled={isGenerating}
                    className="px-4 py-2 bg-accent-primary/20 hover:bg-accent-primary/30 text-accent-primary
                               rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    Generate AI Summary
                  </button>
                </div>
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
