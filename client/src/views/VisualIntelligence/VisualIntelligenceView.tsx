import { useState, useEffect } from 'react'
import { Visualization } from '../../types'
import { BarChart3, RefreshCw } from 'lucide-react'
import { useAppState } from '../../context/AppContext'
import AnimatedChart from '../../components/Charts/AnimatedChart'

interface EnhancedVisualization extends Visualization {
  insight?: string
  confidence?: number
  animation?: 'grow' | 'reveal' | 'pulse'
  data: {
    labels: string[]
    values: number[]
    units?: string
  }
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {visualizations.map((viz) => (
            <AnimatedChart
              key={viz.id}
              type={viz.type as 'bar' | 'line' | 'pie' | 'timeline' | 'radial'}
              title={viz.title}
              description={viz.description}
              insight={(viz as EnhancedVisualization).insight}
              data={viz.data}
              confidence={(viz as EnhancedVisualization).confidence}
            />
          ))}
        </div>
      )}
    </div>
  )
}

