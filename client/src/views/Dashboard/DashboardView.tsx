import { BarChart3, Users, CheckCircle, TrendingUp, Clock, Target } from 'lucide-react'
import { mockDashboardStats, mockRecentActions } from '../../data/mockData'

interface StatCardProps {
  title: string
  value: string | number
  icon: React.ComponentType<{ className?: string }>
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
 * Implements Requirements 8.1-8.5 for dashboard display
 */
export default function DashboardView() {
  const stats = mockDashboardStats
  const recentActions = mockRecentActions

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-400 mt-1">Your meeting intelligence overview</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="Total Meetings"
          value={stats.totalMeetings}
          icon={BarChart3}
          trend="+12% this month"
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
          trend="+5% vs last week"
          color="#10b981"
        />
        <StatCard
          title="Engagement Rate"
          value={`${stats.engagementRate}%`}
          icon={Users}
          color="#f59e0b"
        />
        <StatCard
          title="Action Items"
          value={stats.totalActionItems}
          icon={CheckCircle}
          color="#3b82f6"
        />
        <StatCard
          title="Completed"
          value={`${stats.completedActions}/${stats.totalActionItems}`}
          icon={CheckCircle}
          trend="82% completion rate"
          color="#10b981"
        />
      </div>

      {/* Recent Actions */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Recent Actions</h2>
        <div className="space-y-3">
          {recentActions.map((action) => (
            <div 
              key={action.id}
              className="flex items-center justify-between p-3 rounded-lg bg-dark-700/30 hover:bg-dark-700/50 transition-smooth"
            >
              <div className="flex items-center gap-3">
                <div 
                  className={`w-2 h-2 rounded-full ${
                    action.status === 'completed' ? 'bg-accent-success' :
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
                <div 
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold text-white"
                  style={{ backgroundColor: action.assignee.color }}
                >
                  {action.assignee.initials}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
