import './AnimatedChart.css'

interface ChartData {
  labels: string[]
  values: number[]
  units?: string
}

interface AnimatedChartProps {
  type: 'bar' | 'line' | 'pie' | 'timeline' | 'radial'
  title: string
  description: string
  insight?: string
  data: ChartData
  confidence?: number
  animation?: 'grow' | 'reveal' | 'pulse'
}

const CHART_COLORS = ['#6366f1', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#3b82f6']

/**
 * AnimatedChart - Premium animated visualization component
 * Renders bar, line, pie, and timeline charts with smooth animations
 */
export default function AnimatedChart({
  type,
  title,
  description,
  insight,
  data,
  confidence = 0.9,
}: AnimatedChartProps) {
  const formatValue = (value: number, units?: string) => {
    if (units === 'USD' || units === '$') {
      return value >= 1000 ? `$${(value / 1000).toFixed(0)}K` : `$${value}`
    }
    if (units === '%') {
      return `${value}%`
    }
    return value >= 1000 ? `${(value / 1000).toFixed(1)}K` : String(value)
  }

  const renderBarChart = () => {
    const maxValue = Math.max(...data.values)
    
    return (
      <div className="bar-chart">
        {data.values.map((value, i) => (
          <div key={i} className="bar-column">
            <div className="bar-wrapper">
              <div 
                className="bar"
                style={{ height: `${(value / maxValue) * 100}%` }}
              >
                <span className="bar-value">{formatValue(value, data.units)}</span>
              </div>
            </div>
            <span className="bar-label">{data.labels[i]}</span>
          </div>
        ))}
      </div>
    )
  }

  const renderLineChart = () => {
    const maxValue = Math.max(...data.values)
    const minValue = Math.min(...data.values)
    const range = maxValue - minValue || 1
    const padding = 20
    const width = 100
    const height = 60
    
    const points = data.values.map((value, i) => ({
      x: padding + (i / (data.values.length - 1)) * (width - padding * 2),
      y: height - padding - ((value - minValue) / range) * (height - padding * 2)
    }))
    
    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
    const areaD = `${pathD} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`
    
    return (
      <div className="line-chart">
        <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
          <defs>
            <linearGradient id="animatedLineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
            <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={areaD} className="line-area" />
          <path d={pathD} className="line-path" />
          {points.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="4" className="line-dot" />
          ))}
        </svg>
      </div>
    )
  }

  const renderPieChart = () => {
    const total = data.values.reduce((a, b) => a + b, 0)
    let currentAngle = -90 // Start from top
    
    const segments = data.values.map((value, i) => {
      const angle = (value / total) * 360
      const startAngle = currentAngle
      currentAngle += angle
      
      const startRad = (startAngle * Math.PI) / 180
      const endRad = ((startAngle + angle) * Math.PI) / 180
      
      const x1 = 50 + 40 * Math.cos(startRad)
      const y1 = 50 + 40 * Math.sin(startRad)
      const x2 = 50 + 40 * Math.cos(endRad)
      const y2 = 50 + 40 * Math.sin(endRad)
      
      const largeArc = angle > 180 ? 1 : 0
      
      return {
        d: `M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`,
        color: CHART_COLORS[i % CHART_COLORS.length],
        label: data.labels[i],
        value,
        percentage: ((value / total) * 100).toFixed(0)
      }
    })
    
    return (
      <div className="pie-chart">
        <svg className="pie-svg" viewBox="0 0 100 100">
          {segments.map((seg, i) => (
            <path key={i} d={seg.d} fill={seg.color} className="pie-segment" />
          ))}
        </svg>
        <div className="pie-legend">
          {segments.map((seg, i) => (
            <div key={i} className="legend-item">
              <div className="legend-dot" style={{ backgroundColor: seg.color }} />
              <span className="legend-text">{seg.label}</span>
              <span className="legend-value">{seg.percentage}%</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const renderTimelineChart = () => {
    const maxValue = Math.max(...data.values)
    
    return (
      <div className="timeline-chart">
        {data.values.map((value, i) => (
          <div key={i} className="timeline-item">
            <span className="timeline-label">{data.labels[i]}</span>
            <div className="timeline-bar-wrapper">
              <div 
                className="timeline-bar"
                style={{ width: `${(value / maxValue) * 100}%` }}
              />
            </div>
            <span className="timeline-value">{formatValue(value, data.units)}</span>
          </div>
        ))}
      </div>
    )
  }

  const renderChart = () => {
    switch (type) {
      case 'bar':
        return renderBarChart()
      case 'line':
        return renderLineChart()
      case 'pie':
        return renderPieChart()
      case 'timeline':
      case 'radial':
        return renderTimelineChart()
      default:
        return renderBarChart()
    }
  }

  const confidenceClass = confidence >= 0.8 ? 'confidence-high' : 'confidence-medium'

  return (
    <div className="animated-chart-container">
      <div className="chart-header">
        <span className={`confidence-badge ${confidenceClass}`}>
          {Math.round(confidence * 100)}% confidence
        </span>
        <h3 className="chart-title">{title}</h3>
        <p className="chart-description">{description}</p>
        {insight && (
          <div className="chart-insight">
            💡 {insight}
          </div>
        )}
      </div>
      <div className="chart-area">
        {renderChart()}
      </div>
    </div>
  )
}
