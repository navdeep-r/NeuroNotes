import { useState, useEffect } from 'react'
import {
  TrendingUp, Users, MessageSquare, CheckCircle,
  Target, Lightbulb, BarChart2, RefreshCw, Brain
} from 'lucide-react'
import { useAppState } from '../../context/AppContext'
import AnimatedChart from '../../components/Charts/AnimatedChart'

interface SpeakerStat {
  speaker: string
  wordCount: number
  segments: number
  percentage: number
  color: string
}

interface TopicItem {
  topic: string
  weight: number
  color?: string
}

interface EngagementPoint {
  minute: number
  activity: number
}

interface MeetingAnalytics {
  speakerStats: SpeakerStat[]
  topicBreakdown: TopicItem[]
  engagementTimeline: EngagementPoint[]
  sentimentScore: number
  sentimentLabel: string
  decisionCount: number
  actionCount: number
  avgResponseTime: number
  meetingEfficiency: number
  keyHighlights: string[]
  meetingTitle?: string
  meetingDuration?: number
  status?: string
}

/**
 * InsightsView - Comprehensive post-meeting analytics dashboard
 */
export default function InsightsView() {
  const { activeMeetingId, meetings } = useAppState()
  const [analytics, setAnalytics] = useState<MeetingAnalytics | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const activeMeeting = meetings.find(m => m.id === activeMeetingId)

  const fetchAnalytics = async () => {
    if (!activeMeetingId) {
      setAnalytics(null)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`http://localhost:5000/api/meetings/${activeMeetingId}/insights`)
      if (!response.ok) {
        throw new Error('Failed to fetch insights')
      }

      const data = await response.json()
      setAnalytics(data)
    } catch (err) {
      console.error('[Insights] Error:', err)
      setError('Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [activeMeetingId])

  const getSentimentColor = (score: number) => {
    if (score >= 0.7) return 'text-green-400'
    if (score >= 0.4) return 'text-yellow-400'
    return 'text-red-400'
  }

  return (
    <div className="p-6 space-y-6 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Brain className="w-7 h-7 text-accent-primary" />
            Insights & Analytics
          </h1>
          <p className="text-gray-400 mt-1">
            {activeMeeting
              ? `Deep analysis for: ${activeMeeting.title}`
              : 'Select a meeting to view comprehensive analytics'}
          </p>
        </div>
        {activeMeetingId && (
          <button
            onClick={fetchAnalytics}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-accent-primary/10 text-accent-primary rounded-lg hover:bg-accent-primary/20 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-400">
          {error}
        </div>
      )}

      {/* No Meeting Selected */}
      {!activeMeetingId && (
        <div className="flex flex-col items-center justify-center py-20 text-center glass-card">
          <BarChart2 className="w-12 h-12 text-gray-600 mb-4" />
          <h2 className="text-xl font-medium text-white mb-2">No meeting selected</h2>
          <p className="text-gray-500 max-w-sm">
            Select a completed meeting from the sidebar to view comprehensive analytics and insights.
          </p>
        </div>
      )}

      {/* Loading State */}
      {activeMeetingId && loading && !analytics && (
        <div className="flex flex-col items-center justify-center py-20 text-center glass-card">
          <RefreshCw className="w-12 h-12 text-accent-primary mb-4 animate-spin" />
          <h2 className="text-xl font-medium text-white mb-2">Analyzing meeting...</h2>
          <p className="text-gray-500">Generating comprehensive insights</p>
        </div>
      )}

      {/* Analytics Dashboard */}
      {analytics && (
        <>
          {/* Key Metrics Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="glass-card p-5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-accent-primary/10">
                  <CheckCircle className="w-5 h-5 text-accent-primary" />
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Decisions</p>
                  <p className="text-2xl font-bold text-white">{analytics.decisionCount}</p>
                </div>
              </div>
            </div>

            <div className="glass-card p-5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-highlight-action/10">
                  <Target className="w-5 h-5 text-highlight-action" />
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Action Items</p>
                  <p className="text-2xl font-bold text-white">{analytics.actionCount}</p>
                </div>
              </div>
            </div>

            <div className="glass-card p-5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-highlight-decision/10">
                  <TrendingUp className="w-5 h-5 text-highlight-decision" />
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Efficiency</p>
                  <p className="text-2xl font-bold text-white">{analytics.meetingEfficiency}%</p>
                </div>
              </div>
            </div>

            <div className="glass-card p-5">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${analytics.sentimentScore >= 0.7 ? 'bg-green-500/10' : analytics.sentimentScore >= 0.4 ? 'bg-yellow-500/10' : 'bg-red-500/10'}`}>
                  <MessageSquare className={`w-5 h-5 ${getSentimentColor(analytics.sentimentScore)}`} />
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Sentiment</p>
                  <p className={`text-2xl font-bold ${getSentimentColor(analytics.sentimentScore)}`}>
                    {analytics.sentimentLabel}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Speaker Participation */}
            <AnimatedChart
              type="pie"
              title="Speaker Participation"
              description="Distribution of speaking time across participants"
              data={{
                labels: analytics.speakerStats.map(s => s.speaker),
                values: analytics.speakerStats.map(s => s.percentage)
              }}
              confidence={0.95}
            />

            {/* Topic Distribution */}
            <AnimatedChart
              type="bar"
              title="Topic Distribution"
              description="Key topics discussed during the meeting"
              data={{
                labels: analytics.topicBreakdown.map(t => t.topic),
                values: analytics.topicBreakdown.map(t => t.weight),
                units: '%'
              }}
              confidence={0.88}
            />

            {/* Engagement Timeline */}
            <AnimatedChart
              type="line"
              title="Engagement Over Time"
              description="Activity level throughout the meeting duration"
              data={{
                labels: analytics.engagementTimeline.map(e => `Min ${e.minute}`),
                values: analytics.engagementTimeline.map(e => e.activity)
              }}
              confidence={0.92}
            />

            {/* Key Highlights */}
            <div className="glass-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <Lightbulb className="w-5 h-5 text-highlight-action" />
                <h3 className="text-lg font-semibold text-white">Key Highlights</h3>
              </div>
              <div className="space-y-3">
                {analytics.keyHighlights.map((highlight, i) => (
                  <div 
                    key={i}
                    className="flex items-start gap-3 p-3 rounded-lg bg-dark-700/30"
                  >
                    <div className="w-6 h-6 rounded-full bg-accent-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-accent-primary">{i + 1}</span>
                    </div>
                    <p className="text-gray-300 text-sm leading-relaxed">{highlight}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Speaker Details Table */}
          <div className="glass-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-accent-secondary" />
              <h3 className="text-lg font-semibold text-white">Speaker Breakdown</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-4 text-gray-400 text-sm font-medium">Speaker</th>
                    <th className="text-right py-3 px-4 text-gray-400 text-sm font-medium">Words</th>
                    <th className="text-right py-3 px-4 text-gray-400 text-sm font-medium">Segments</th>
                    <th className="text-right py-3 px-4 text-gray-400 text-sm font-medium">Share</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.speakerStats.map((speaker, i) => (
                    <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: speaker.color }}
                          />
                          <span className="text-white font-medium">{speaker.speaker}</span>
                        </div>
                      </td>
                      <td className="text-right py-3 px-4 text-gray-300">{speaker.wordCount.toLocaleString()}</td>
                      <td className="text-right py-3 px-4 text-gray-300">{speaker.segments}</td>
                      <td className="text-right py-3 px-4">
                        <span className="text-accent-primary font-semibold">{speaker.percentage}%</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
