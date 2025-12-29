import { useState, useRef } from 'react'
import { X, Play, Plus, Users } from 'lucide-react'

interface NewMeetingModalProps {
    isOpen: boolean
    onClose: () => void
    onCreate: (title: string, participants: string[]) => void
}

export default function NewMeetingModal({ isOpen, onClose, onCreate }: NewMeetingModalProps) {
    const [title, setTitle] = useState('')
    const [currentParticipant, setCurrentParticipant] = useState('')
    const [participants, setParticipants] = useState<string[]>([])
    const inputRef = useRef<HTMLInputElement>(null)

    if (!isOpen) return null

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        onCreate(title, participants)
        // Reset form
        setTitle('')
        setParticipants([])
        setCurrentParticipant('')
    }

    const addParticipant = () => {
        if (currentParticipant.trim()) {
            setParticipants([...participants, currentParticipant.trim()])
            setCurrentParticipant('')
            inputRef.current?.focus()
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault() // Prevent form submission
            addParticipant()
        }
    }

    const removeParticipant = (index: number) => {
        setParticipants(participants.filter((_, i) => i !== index))
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="w-full max-w-md bg-dark-800 border border-white/10 rounded-2xl shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
                {/* Header */}
                <div className="relative h-32 bg-gradient-to-br from-accent-primary via-accent-secondary to-purple-900 p-6 flex flex-col justify-end">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full transition-all backdrop-blur-md"
                    >
                        <X className="w-4 h-4" />
                    </button>
                    <h2 className="text-2xl font-bold text-white mb-1">
                        New Analysis
                    </h2>
                    <p className="text-white/70 text-sm">
                        Set up your session to begin tracking
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Title Input */}
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                            Meeting Title
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g. Q4 Strategy Review"
                            className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-accent-primary/50 transition-all text-sm"
                            required
                            autoFocus
                        />
                    </div>

                    {/* Participants Input */}
                    <div className="space-y-3">
                        <label className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                            <Users className="w-3 h-3" />
                            Participants
                        </label>

                        {/* Chip List */}
                        <div className="flex flex-wrap gap-2 min-h-[32px]">
                            {participants.map((p, i) => (
                                <span key={i} className="inline-flex items-center gap-1 px-3 py-1 bg-accent-primary/20 text-accent-primary border border-accent-primary/20 rounded-full text-sm animate-in fade-in zoom-in-90 duration-150">
                                    {p}
                                    <button
                                        type="button"
                                        onClick={() => removeParticipant(i)}
                                        className="hover:bg-accent-primary/20 rounded-full p-0.5 transition-colors"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </span>
                            ))}
                        </div>

                        {/* Input Area */}
                        <div className="relative">
                            <input
                                ref={inputRef}
                                type="text"
                                value={currentParticipant}
                                onChange={(e) => setCurrentParticipant(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder={participants.length === 0 ? "Type a name and press Enter..." : "Add another..."}
                                className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3 pr-10 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-accent-primary/50 transition-all text-sm"
                            />
                            <button
                                type="button"
                                onClick={addParticipant}
                                disabled={!currentParticipant.trim()}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-white disabled:opacity-30 transition-colors"
                            >
                                <Plus className="w-5 h-5" />
                            </button>
                        </div>
                        <p className="text-xs text-gray-500 pl-1">
                            Press <span className="text-gray-400 font-mono bg-white/5 px-1 rounded">Enter</span> to add a person
                        </p>
                    </div>

                    <div className="pt-2 flex justify-end gap-3 border-t border-white/5 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2.5 text-sm font-medium text-gray-400 hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-6 py-2.5 bg-gradient-to-r from-accent-primary to-accent-secondary hover:brightness-110 text-white text-sm font-bold rounded-xl shadow-lg shadow-accent-primary/20 flex items-center gap-2 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                        >
                            <Play className="w-4 h-4 fill-current" />
                            Start Analysis
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
