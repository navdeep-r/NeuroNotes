import { TrendingUp, Clock, Target, Lightbulb, ArrowRight } from 'lucide-react'
import { mockTimeMetrics, mockTrendData, mockRecommendations } from '../../data/mockData'

/**
 * InsightsView - Meeting analytics and recommendations
 * Implements Requirements 11.1-11.4 for insights display
 */
export default function InsightsView() {
  const timeMetrics = mockTimeMetrics
  const trendData = mockTrendData
  const recommendations = mockRecommendations

  const formatMinutes = (mins: number): string => {
    const hours = Math.floor(mins / 60)
    const minutes = mins % 60
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  const maxTrend = Math.max(...trendData.map(t => t.value))

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Insights & Analytics</h1>
        <p className="text-gray-400 mt-1">Understand your meeting patterns and efficiency</p>
      </div>

      {/* Time Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent-primary/10">
              <Clock className="w-5 h-5 text-accent-primary" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Total Meeting Time</p>
              <p className="text-xl font-bold text-white">{formatMinutes(timeMetrics.totalMeetingTime)}</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent-secondary/10">
              <Target className="w-5 h-5 text-accent-secondary" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Avg Meeting Length</p>
              <p className="text-xl font-bold text-white">{formatMinutes(timeMetrics.averageMeetingLength)}</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-highlight-decision/10">
              <TrendingUp className="w-5 h-5 text-highlight-decision" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Time in Decisions</p>
              <p className="text-xl font-bold text-white">{formatMinutes(timeMetrics.timeInDecisions)}</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-highlight-action/10">
              <Clock className="w-5 h-5 text-highlight-action" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Time in Discussion</p>
              <p className="text-xl font-bold text-white">{formatMinutes(timeMetrics.timeInDiscussion)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Efficiency Trend */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Meeting Efficiency Trend</h2>
        <div className="h-48 flex items-end gap-2">
          {trendData.map((point, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full flex flex-col items-center">
                <span className="text-sm text-accent-primary font-medium mb-1">{point.value}%</span>
                <div 
                  className="w-full bg-gradient-to-t from-accent-primary to-accent-secondary rounded-t transition-all duration-500"
                  style={{ height: `${(point.value / maxTrend) * 120}px` }}
                />
              </div>
              <span className="text-xs text-gray-500">
                {new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-2 text-sm text-accent-success">
          <TrendingUp className="w-4 h-4" />
          <span>+12% improvement over the past month</span>
        </div>
      </div>

      {/* Recommendations */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb className="w-5 h-5 text-highlight-action" />
          <h2 className="text-lg font-semibold text-white">Recommendations</h2>
        </div>
        <div className="space-y-3">
          {recommendations.map((rec) => (
            <div 
              key={rec.id}
              className="p-4 rounded-lg bg-dark-700/30 hover:bg-dark-700/50 transition-smooth cursor-pointer group"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-white">{rec.title}</h3>
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      rec.impact === 'high' ? 'bg-accent-success/20 text-accent-success' :
                      rec.impact === 'medium' ? 'bg-accent-warning/20 text-accent-warning' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {rec.impact} impact
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm mt-1">{rec.description}</p>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-500 group-hover:text-accent-primary transition-smooth" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
