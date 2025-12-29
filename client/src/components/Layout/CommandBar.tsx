import { useEffect, useRef } from 'react'
import { Mic, Command } from 'lucide-react'
import { useAppState, useAppActions } from '../../context/AppContext'
import { useNavigate } from 'react-router-dom'

/**
 * CommandBar - Global command input for AI interactions
 * Implements Requirements 7.1-7.5 for command bar functionality
 */
export default function CommandBar() {
  const { commandInput } = useAppState()
  const { setCommandInput, executeCommand } = useAppActions()
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  // Handle keyboard shortcut (⌘K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!commandInput.trim()) return

    // Parse and route commands
    const cmd = commandInput.toLowerCase().trim()
    
    if (cmd.includes('chart') || cmd.includes('visual')) {
      navigate('/visuals')
    } else if (cmd.includes('insight') || cmd.includes('analytics')) {
      navigate('/insights')
    } else if (cmd.includes('history') || cmd.includes('past')) {
      navigate('/history')
    }

    executeCommand(commandInput)
  }

  return (
    <div className="h-full flex items-center px-6">
      <form onSubmit={handleSubmit} className="flex-1 flex items-center gap-4">
        {/* Voice icon */}
        <button
          type="button"
          className="p-2 rounded-lg hover:bg-white/5 transition-smooth text-gray-400 hover:text-white"
          aria-label="Voice input"
        >
          <Mic className="w-5 h-5" />
        </button>

        {/* Command input */}
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            type="text"
            value={commandInput}
            onChange={(e) => setCommandInput(e.target.value)}
            placeholder="Ask MinuteFlow to create a chart or assign an action…"
            className="w-full bg-dark-700/50 border border-white/10 rounded-xl px-4 py-3 
                       text-white placeholder-gray-500 focus:outline-none focus:border-accent-primary/50
                       focus:ring-2 focus:ring-accent-primary/20 transition-smooth"
            data-testid="command-input"
          />
        </div>

        {/* Keyboard shortcut hint */}
        <div className="flex items-center gap-1 text-gray-500 text-sm">
          <kbd className="px-2 py-1 bg-dark-600 rounded border border-white/10 text-xs flex items-center gap-1">
            <Command className="w-3 h-3" />
            <span>K</span>
          </kbd>
        </div>
      </form>
    </div>
  )
}
