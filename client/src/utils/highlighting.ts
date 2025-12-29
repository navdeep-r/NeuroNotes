import React from 'react'

export interface HighlightMatch {
  type: 'metric' | 'decision' | 'action'
  text: string
  startIndex: number
  endIndex: number
}

// Patterns for different highlight types
const METRIC_PATTERN = /(\$[\d,]+(?:\.\d+)?[KMB]?|\d+(?:\.\d+)?%|\d+(?:,\d{3})*(?:\.\d+)?(?:\s*(?:hours?|minutes?|days?|weeks?|months?|years?|dollars?|percent))?)/gi
const DECISION_PATTERN = /(let's move forward|we decided|decision|agreed|approved|confirmed|finalized|let's go with|I've decided|we should prioritize)/gi
const ACTION_PATTERN = /(I'll|I will|action item|by tomorrow|by end of day|by wednesday|by friday|will prepare|will reach out|will compile|will start working)/gi

/**
 * Find all highlight matches in content
 * Implements Requirements 6.1-6.3 for content highlighting
 */
export function findHighlights(content: string): HighlightMatch[] {
  const matches: HighlightMatch[] = []

  // Find metrics
  let match: RegExpExecArray | null
  while ((match = METRIC_PATTERN.exec(content)) !== null) {
    matches.push({
      type: 'metric',
      text: match[0],
      startIndex: match.index,
      endIndex: match.index + match[0].length,
    })
  }

  // Find decisions
  while ((match = DECISION_PATTERN.exec(content)) !== null) {
    matches.push({
      type: 'decision',
      text: match[0],
      startIndex: match.index,
      endIndex: match.index + match[0].length,
    })
  }

  // Find actions
  while ((match = ACTION_PATTERN.exec(content)) !== null) {
    matches.push({
      type: 'action',
      text: match[0],
      startIndex: match.index,
      endIndex: match.index + match[0].length,
    })
  }

  // Sort by start index
  matches.sort((a, b) => a.startIndex - b.startIndex)

  // Remove overlapping matches (keep first)
  const filtered: HighlightMatch[] = []
  let lastEnd = 0
  for (const m of matches) {
    if (m.startIndex >= lastEnd) {
      filtered.push(m)
      lastEnd = m.endIndex
    }
  }

  return filtered
}

/**
 * Get CSS class for highlight type
 */
export function getHighlightClass(type: 'metric' | 'decision' | 'action'): string {
  switch (type) {
    case 'metric':
      return 'highlight-metric'
    case 'decision':
      return 'highlight-decision'
    case 'action':
      return 'highlight-action'
    default:
      return ''
  }
}

/**
 * Render content with highlights as React elements
 * Returns an array of React nodes with highlighted spans
 */
export function renderHighlightedContent(content: string): React.ReactNode[] {
  const highlights = findHighlights(content)
  
  if (highlights.length === 0) {
    return [content]
  }

  const result: React.ReactNode[] = []
  let lastIndex = 0

  highlights.forEach((highlight, index) => {
    // Add text before highlight
    if (highlight.startIndex > lastIndex) {
      result.push(content.slice(lastIndex, highlight.startIndex))
    }

    // Add highlighted span
    result.push(
      React.createElement(
        'span',
        {
          key: `highlight-${index}`,
          className: getHighlightClass(highlight.type),
          'data-highlight-type': highlight.type,
        },
        highlight.text
      )
    )

    lastIndex = highlight.endIndex
  })

  // Add remaining text
  if (lastIndex < content.length) {
    result.push(content.slice(lastIndex))
  }

  return result
}

/**
 * Check if content contains any highlightable phrases
 */
export function hasHighlights(content: string): boolean {
  return findHighlights(content).length > 0
}

/**
 * Check if content contains a specific type of highlight
 */
export function hasHighlightType(content: string, type: 'metric' | 'decision' | 'action'): boolean {
  return findHighlights(content).some(h => h.type === type)
}
