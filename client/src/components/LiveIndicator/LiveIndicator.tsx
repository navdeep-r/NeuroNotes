/**
 * LiveIndicator - Displays a pulsing LIVE badge
 * Implements Requirement 4.1 for live meeting indication
 */
export default function LiveIndicator() {
  return (
    <div 
      className="flex items-center gap-2 px-3 py-1.5 bg-red-500/20 rounded-full"
      data-testid="live-indicator"
    >
      <span className="relative flex h-2.5 w-2.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
      </span>
      <span className="text-red-400 text-sm font-semibold uppercase tracking-wide">
        Live
      </span>
    </div>
  )
}
