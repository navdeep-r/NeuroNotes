import { useState, useEffect } from 'react'
import { Visualization } from '../../types'
import { LineChart, BarChart3, Clock, PieChart, RefreshCw } from 'lucide-react'
import { useAppState } from '../../context/AppContext'

interface VisualizationCardProps {
  visualization: Visualization
}

function VisualizationCard({ visualization }: VisualizationCardProps) {
  const getIcon = () => {
    switch (visualization.type) {
      case 'line': return LineChart
      case 'bar': return BarChart3
      case 'timeline': return Clock
      case 'pie': return PieChart
      default: return BarChart3
    }
  }

  const Icon = getIcon()

  // Simple chart representation
  const renderChart = () => {
    const values = visualization.data?.values || []
    const labels = visualization.data?.labels || []

    if (values.length === 0) {
      return <p className="text-gray-500 text-sm mt-4">No data available</p>
    }

    const maxValue = Math.max(...values)

    switch (visualization.type) {
      case 'bar':
        return (
          <div className="flex items-end gap-2 h-32 mt-4">
            {values.map((value, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full bg-gradient-to-t from-accent-primary to-accent-secondary rounded-t"
                  style={{ height: `${(value / maxValue) * 100}%` }}
                />
                <span className="text-xs text-gray-500">{labels[i]}</span>
              </div>
            ))}
          </div>
        )
      case 'line':
        return (
          <div className="h-32 mt-4 flex items-end">
            <svg className="w-full h-full" viewBox="0 0 100 50" preserveAspectRatio="none">
              <polyline
                fill="none"
                stroke="url(#lineGradient)"
                strokeWidth="2"
                points={values.map((v, i) =>
                  `${(i / (values.length - 1)) * 100},${50 - (v / maxValue) * 45}`
                ).join(' ')}
              />
              <defs>
                <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        )
      case 'pie':
        const total = values.reduce((a, b) => a + b, 0)
        const colors = ['#6366f1', '#8b5cf6', '#10b981', '#f59e0b']
        let currentAngle = 0

        return (
          <div className="flex items-center gap-4 mt-4">
            <svg className="w-24 h-24" viewBox="0 0 32 32">
              {values.map((value, i) => {
                const angle = (value / total) * 360
                const startAngle = currentAngle
                currentAngle += angle

                const x1 = 16 + 14 * Math.cos((startAngle - 90) * Math.PI / 180)
                const y1 = 16 + 14 * Math.sin((startAngle - 90) * Math.PI / 180)
                const x2 = 16 + 14 * Math.cos((startAngle + angle - 90) * Math.PI / 180)
                const y2 = 16 + 14 * Math.sin((startAngle + angle - 90) * Math.PI / 180)
                const largeArc = angle > 180 ? 1 : 0

                return (
                  <path
                    key={i}
                    d={`M 16 16 L ${x1} ${y1} A 14 14 0 ${largeArc} 1 ${x2} ${y2} Z`}
                    fill={colors[i % colors.length]}
                  />
                )
              })}
            </svg>
            <div className="space-y-1">
              {labels.map((label, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colors[i % colors.length] }} />
                  <span className="text-gray-400">{label}</span>
                </div>
              ))}
            </div>
          </div>
        )
      case 'timeline':
        return (
          <div className="mt-4 space-y-2">
            {labels.map((label, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-16 truncate">{label}</span>
                <div className="flex-1 h-2 bg-dark-600 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-accent-primary to-accent-secondary rounded-full"
                    style={{ width: `${(values[i] / maxValue) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-gray-400 w-8">{values[i]}</span>
              </div>
            ))}
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="glass-card p-5" data-testid={`viz-card-${visualization.id}`}>
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-white" data-testid="viz-title">{visualization.title}</h3>
          <p className="text-sm text-gray-400 mt-1" data-testid="viz-description">{visualization.description}</p>
        </div>
        <div className="p-2 rounded-lg bg-accent-primary/10">
          <Icon className="w-5 h-5 text-accent-primary" />
        </div>
      </div>
      {renderChart()}
    </div>
  )
}

/**
 * VisualIntelligenceView - Grid of AI-generated visualizations
 * Fetches from API based on active meeting
 */
export default function VisualIntelligenceView() {
  const { activeMeetingId, meetings } = useAppState()
  const [visualizations, setVisualizations] = useState<Visualization[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const activeMeeting = meetings.find(m => m.id === activeMeetingId)

  const fetchVisualizations = async () => {
    if (!activeMeetingId) {
      setVisualizations([])
      return
    }

    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`http://localhost:5000/api/meetings/${activeMeetingId}/artifacts`)
      if (!response.ok) {
        throw new Error('Failed to fetch visualizations')
      }

      const data = await response.json()
      // Transform backend format to frontend format
      const transformedVisuals: Visualization[] = (data.visuals || []).map((v: any) => ({
        id: v._id || v.id || String(Date.now()),
        type: v.type || 'bar',
        title: v.title || 'Untitled',
        description: v.description || '',
        data: {
          labels: v.data?.labels || [],
          values: v.data?.values || v.data?.datasets?.[0]?.data || []
        }
      }))

      setVisualizations(transformedVisuals)
    } catch (err) {
      console.error('[VisualIntelligence] Error fetching:', err)
      setError('Failed to load visualizations')
    } finally {
      setLoading(false)
    }
  }

  // Fetch on mount and when meeting changes
  useEffect(() => {
    fetchVisualizations()
  }, [activeMeetingId])

  // Auto-refresh every 5 seconds for live updates
  useEffect(() => {
    if (!activeMeetingId) return

    const interval = setInterval(fetchVisualizations, 5000)
    return () => clearInterval(interval)
  }, [activeMeetingId])

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Visual Intelligence</h1>
          <p className="text-gray-400 mt-1">
            {activeMeeting
              ? `Visualizations for: ${activeMeeting.title}`
              : 'Select a meeting to view visualizations'}
          </p>
        </div>
        {activeMeetingId && (
          <button
            onClick={fetchVisualizations}
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
          <BarChart3 className="w-12 h-12 text-gray-600 mb-4" />
          <h2 className="text-xl font-medium text-white mb-2">No meeting selected</h2>
          <p className="text-gray-500 max-w-sm">
            Select a meeting from the sidebar or History view to see its visualizations.
          </p>
        </div>
      )}

      {/* Loading State */}
      {activeMeetingId && loading && visualizations.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center glass-card">
          <RefreshCw className="w-12 h-12 text-accent-primary mb-4 animate-spin" />
          <h2 className="text-xl font-medium text-white mb-2">Loading visualizations...</h2>
        </div>
      )}

      {/* Empty State */}
      {activeMeetingId && !loading && visualizations.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center glass-card">
          <BarChart3 className="w-12 h-12 text-gray-600 mb-4" />
          <h2 className="text-xl font-medium text-white mb-2">No visualizations yet</h2>
          <p className="text-gray-500 max-w-md">
            During a meeting, say: <br />
            <span className="text-accent-primary font-mono">"Hey NeuroNotes, create a chart about [your data]. Over."</span>
            <br /><br />
            <span className="text-gray-400 text-sm">
              Example: "Hey NeuroNotes, create a chart showing Q1 sales were 50K, Q2 was 75K, and Q3 hit 100K. Over."
            </span>
          </p>
        </div>
      )}

      {/* Visualization Grid */}
      {visualizations.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {visualizations.map((viz) => (
            <VisualizationCard key={viz.id} visualization={viz} />
          ))}
        </div>
      )}
    </div>
  )
}

