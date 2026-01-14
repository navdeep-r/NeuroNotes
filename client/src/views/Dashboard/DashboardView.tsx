import { BarChart3, Users, TrendingUp, Clock, Target, Calendar } from 'lucide-react'
import { useAppState } from '../../context/AppContext'

interface StatCardProps {
  title: string
  value: string | number
  icon: React.ElementType
  trend?: string
  color: string
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
  const { meetings } = useAppState()
  const stats = {
    totalMeetings: 0,
    meetingsThisWeek: 0,
    productivityScore: 0,
    engagementRate: 0,
    totalActionItems: 0,
    completedActions: 0,
  }
  const recentActions: any[] = []

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-400 mt-1">Your meeting intelligence overview</p>
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
              trend="+0% this month"
              color="#6366f1"
            />
            <StatCard
              title="This Week"
              value={stats.meetingsThisWeek}
              icon={Clock}
              color="#8b5cf6"
            />
            <StatCard
              title="Productivity Score"
              value={`${stats.productivityScore}%`}
              icon={Target}
              trend="+0% vs last week"
              color="#10b981"
            />
            <StatCard
              title="Engagement Rate"
              value={`${stats.engagementRate}%`}
              icon={Users}
              color="#f59e0b"
            />
          </div>

          {/* Recent Actions */}
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Recent Actions</h2>
            {recentActions.length === 0 ? (
              <p className="text-gray-500 text-sm py-8 text-center">No recent actions found.</p>
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
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Upcoming Meetings */}
        <div className="glass-card p-6 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-accent-primary" />
              Upcoming Meetings
            </h2>
            <span className="px-2 py-1 rounded-md bg-accent-primary/10 text-accent-primary text-[10px] font-bold uppercase tracking-wider">
              New
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
              meetings.filter((m: any) => m.status === 'scheduled').map((meeting: any) => (
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
        </div>
      </div>
    </div>
  )
}
