import { TranscriptEntry as TranscriptEntryType } from '../../types'
import { renderHighlightedContent } from '../../utils/highlighting'

interface TranscriptEntryProps {
  entry: TranscriptEntryType
}

/**
 * TranscriptEntry - Single transcript message with speaker and timestamp
 * Implements Requirements 5.1, 6.4 for transcript entry display
 */
export default function TranscriptEntry({ entry }: TranscriptEntryProps) {
  const formatTimestamp = (date: Date): string => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div
      className="flex gap-3 p-3 rounded-lg hover:bg-white/5 transition-smooth"
      data-testid={`transcript-entry-${entry.id}`}
    >
      {/* Speaker avatar */}
      <div
        className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-semibold text-white"
        style={{ backgroundColor: entry.speaker.color }}
        data-testid="entry-avatar"
      >
        {entry.speaker.initials}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Header: speaker name and timestamp */}
        <div className="flex items-center gap-2 mb-1">
          <span
            className="font-medium text-white text-sm"
            data-testid="entry-speaker"
          >
            {entry.speaker.name}
          </span>
          <span
            className="text-xs text-gray-500"
            data-testid="entry-timestamp"
          >
            {formatTimestamp(entry.timestamp)}
          </span>

          {entry.automation && (
            <span className="ml-2 flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
              <span>⚡</span>
              <span className="uppercase tracking-wider font-semibold text-[10px]">{entry.automation.intent.replace('_', ' ')}</span>
            </span>
          )}
        </div>

        {/* Message content with highlights */}
        <p
          className="text-gray-300 text-sm leading-relaxed"
          data-testid="entry-content"
        >
          {renderHighlightedContent(entry.content)}
        </p>
      </div>
    </div>
  )
}
