import { useState, useEffect } from 'react'
import { BarChart3, Users, TrendingUp, Clock, Target, Calendar, CheckCircle, Brain } from 'lucide-react'
import { useAppState } from '../../context/AppContext'

interface StatCardProps {
  title: string
  value: string | number
  icon: React.ElementType
  trend?: string
  color: string
}

interface DashboardStats {
  totalMeetings: number
  meetingsThisWeek: number
  completedMeetings: number
  liveMeetings: number
  totalDecisions: number
  totalActions: number
}

interface RecentAction {
  id: string
  content: string
  meetingTitle: string
  status: string
  assignee?: string
}

function StatCard({ title, value, icon: Icon, trend, color }: StatCardProps) {
  return (
    <div className="glass-card p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-400 text-sm">{title}</p>
          <p className="text-3xl font-bold text-white mt-2">{value}</p>
          {trend && (
            <p className="text-sm text-accent-success mt-2 flex items-center gap-1">
              <TrendingUp className="w-4 h-4" />
              {trend}
            </p>
          )}
        </div>
        <div
          className="p-3 rounded-xl"
          style={{ backgroundColor: `${color}20` }}
        >
          <Icon className="w-6 h-6" style={{ color }} />
        </div>
      </div>
    </div>
  )
}

/**
 * DashboardView - Overview of meeting activity and productivity
 */
export default function DashboardView() {
  const { meetings, activeMeetingId } = useAppState()
  const [recentActions, setRecentActions] = useState<RecentAction[]>([])
  const [loading, setLoading] = useState(false)

  // Calculate stats from meetings
  const now = new Date()
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const stats: DashboardStats = {
    totalMeetings: meetings.length,
    meetingsThisWeek: meetings.filter(m => new Date(m.startTime) >= oneWeekAgo).length,
    completedMeetings: meetings.filter(m => m.status === 'completed').length,
    liveMeetings: meetings.filter(m => m.status === 'live').length,
    totalDecisions: meetings.reduce((sum, m) => {
      return sum + (m.summary?.decisions?.length || 0)
    }, 0),
    totalActions: meetings.reduce((sum, m) => {
      return sum + (m.summary?.actionItems?.length || 0)
    }, 0)
  }

  // Calculate productivity score based on meetings data
  const productivityScore = stats.totalMeetings > 0
    ? Math.round((stats.completedMeetings / stats.totalMeetings) * 100)
    : 0

  // Fetch recent actions from the active meeting or all meetings
  useEffect(() => {
    const fetchRecentActions = async () => {
      setLoading(true)
      try {
        // Get actions from completed meetings
        const completedMeetings = meetings.filter(m => m.status === 'completed').slice(0, 3)
        const allActions: RecentAction[] = []

        for (const meeting of completedMeetings) {
          try {
            const res = await fetch(`http://localhost:5000/api/meetings/${meeting.id}/artifacts`)
            if (res.ok) {
              const data = await res.json()
              if (data.actions && data.actions.length > 0) {
                data.actions.slice(0, 3).forEach((action: any) => {
                  allActions.push({
                    id: action._id || action.id || `${meeting.id}-${Date.now()}`,
                    content: action.content || action.text || 'Action item',
                    meetingTitle: meeting.title,
                    status: action.status || 'pending',
                    assignee: action.assignee
                  })
                })
              }
            }
          } catch (err) {
            console.error(`Failed to fetch actions for meeting ${meeting.id}:`, err)
          }
        }

        setRecentActions(allActions.slice(0, 5))
      } catch (err) {
        console.error('Failed to fetch recent actions:', err)
      } finally {
        setLoading(false)
      }
    }

    if (meetings.length > 0) {
      fetchRecentActions()
    }
  }, [meetings])

  // Get active meeting for quick insights
  const activeMeeting = meetings.find(m => m.id === activeMeetingId)
  const hasKeyPoints = activeMeeting?.summary?.keyPoints && activeMeeting.summary.keyPoints.length > 0

  return (
    <div className="p-6 space-y-6 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Brain className="w-8 h-8 text-accent-primary" />
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-400 mt-1">Your meeting intelligence overview</p>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Stats & Recent Actions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <StatCard
              title="Total Meetings"
              value={stats.totalMeetings}
              icon={BarChart3}
              trend={stats.meetingsThisWeek > 0 ? `${stats.meetingsThisWeek} this week` : undefined}
              color="#6366f1"
            />
            <StatCard
              title="Completed"
              value={stats.completedMeetings}
              icon={CheckCircle}
              color="#10b981"
            />
            <StatCard
              title="Productivity Score"
              value={`${productivityScore}%`}
              icon={Target}
              trend={stats.completedMeetings > 0 ? 'Based on completion rate' : undefined}
              color="#8b5cf6"
            />
            <StatCard
              title="Total Actions"
              value={stats.totalActions}
              icon={Users}
              trend={stats.totalDecisions > 0 ? `${stats.totalDecisions} decisions` : undefined}
              color="#f59e0b"
            />
          </div>

          {/* Recent Actions */}
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Recent Actions</h2>
            {loading ? (
              <p className="text-gray-500 text-sm py-8 text-center">Loading actions...</p>
            ) : recentActions.length === 0 ? (
              <p className="text-gray-500 text-sm py-8 text-center">
                No recent actions found. Complete a meeting to see action items here.
              </p>
            ) : (
              <div className="space-y-3">
                {recentActions.map((action) => (
                  <div
                    key={action.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-dark-700/30 hover:bg-dark-700/50 transition-smooth"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-2 h-2 rounded-full ${action.status === 'completed' ? 'bg-accent-success' :
                          action.status === 'in_progress' ? 'bg-accent-warning' :
                            'bg-gray-500'
                          }`}
                      />
                      <div>
                        <p className="text-white text-sm">{action.content}</p>
                        <p className="text-gray-500 text-xs">{action.meetingTitle}</p>
                      </div>
                    </div>
                    {action.assignee && (
                      <span className="text-xs text-gray-400 bg-white/5 px-2 py-1 rounded">
                        {action.assignee}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active Meeting Insights */}
          {hasKeyPoints && (
            <div className="glass-card p-6">
              <h2 className="text-lg font-semibold text-white mb-4">
                Key Insights: {activeMeeting?.title}
              </h2>
              <div className="space-y-2">
                {activeMeeting.summary.keyPoints.slice(0, 3).map((point: string, i: number) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-dark-700/30">
                    <div className="w-5 h-5 rounded-full bg-accent-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-accent-primary">{i + 1}</span>
                    </div>
                    <p className="text-gray-300 text-sm">{point}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Upcoming Meetings */}
        <div className="glass-card p-6 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-accent-primary" />
              Upcoming Meetings
            </h2>
            <span className="px-2 py-1 rounded-md bg-accent-primary/10 text-accent-primary text-[10px] font-bold uppercase tracking-wider">
              {meetings.filter(m => m.status === 'scheduled').length}
            </span>
          </div>

          <div className="flex-1 space-y-4">
            {meetings.filter((m: any) => m.status === 'scheduled').length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-10 opacity-50">
                <Clock className="w-10 h-10 mb-3 text-gray-500" />
                <p className="text-gray-500 text-sm">No upcoming meetings scheduled.</p>
                <p className="text-gray-600 text-xs mt-1">Approve a "Schedule Meeting" action to see it here.</p>
              </div>
            ) : (
                meetings.filter((m: any) => m.status === 'scheduled').slice(0, 3).map((meeting: any) => (
                <div
                  key={meeting.id}
                  className="p-4 rounded-xl bg-white/5 border border-white/5 hover:border-accent-primary/30 transition-all group"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-medium text-white group-hover:text-accent-primary transition-colors">
                      {meeting.title}
                    </h3>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(meeting.startTime).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(meeting.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    {meeting.meetingLink && (
                      <a
                        href={meeting.meetingLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 flex items-center justify-center gap-2 w-full py-2 bg-accent-primary/10 hover:bg-accent-primary/20 text-accent-primary text-xs font-bold rounded-lg transition-all border border-accent-primary/20"
                      >
                        Join Meeting
                      </a>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Live Meeting Indicator */}
          {stats.liveMeetings > 0 && (
            <div className="mt-4 p-3 rounded-lg bg-green-500/10 border border-green-500/30">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-green-400 text-sm font-medium">
                  {stats.liveMeetings} meeting{stats.liveMeetings > 1 ? 's' : ''} in progress
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
