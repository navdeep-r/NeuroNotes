import { Clock } from 'lucide-react'

interface MeetingTimerProps {
  elapsedTime: number // in seconds
}

/**
 * MeetingTimer - Displays running meeting duration
 * Implements Requirement 4.2 for meeting timer display
 */
export default function MeetingTimer({ elapsedTime }: MeetingTimerProps) {
  const formatTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    const pad = (n: number) => n.toString().padStart(2, '0')

    if (hrs > 0) {
      return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`
    }
    return `${pad(mins)}:${pad(secs)}`
  }

  return (
    <div 
      className="flex items-center gap-2 text-gray-400"
      data-testid="meeting-timer"
    >
      <Clock className="w-4 h-4" />
      <span className="font-mono text-sm">{formatTime(elapsedTime)}</span>
    </div>
  )
}
