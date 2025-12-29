import { X, Sparkles, Copy, Check } from 'lucide-react'
import { useState } from 'react'
import { useAppState, useAppActions } from '../../context/AppContext'

/**
 * AIResponseDisplay - Floating overlay to show AI responses from Gemini
 */
export default function AIResponseDisplay() {
    const { aiResponse, isProcessingCommand } = useAppState()
    const { setAiResponse } = useAppActions()
    const [copied, setCopied] = useState(false)

    if (!aiResponse && !isProcessingCommand) return null

    const handleCopy = () => {
        if (aiResponse) {
            navigator.clipboard.writeText(aiResponse)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        }
    }

    return (
        <div className="fixed bottom-24 right-6 w-[450px] max-h-[500px] z-50 flex flex-col">
            <div className="glass-card overflow-hidden shadow-2xl border-accent-primary/20 flex flex-col h-full animate-in slide-in-from-bottom-4 duration-300">

                {/* Header */}
                <div className="px-4 py-3 bg-accent-primary/10 border-b border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-accent-primary" />
                        <span className="text-sm font-semibold text-white">NeuroNotes AI</span>
                    </div>
                    <button
                        onClick={() => setAiResponse(null)}
                        className="p-1 hover:bg-white/10 rounded-full text-gray-400 transition-smooth"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 overflow-y-auto custom-scrollbar bg-dark-800/80">
                    {isProcessingCommand && !aiResponse ? (
                        <div className="flex flex-col items-center justify-center py-8 space-y-4">
                            <div className="w-8 h-8 border-2 border-accent-primary/30 border-t-accent-primary rounded-full animate-spin" />
                            <p className="text-gray-400 text-sm animate-pulse">Consulting Gemini...</p>
                        </div>
                    ) : (
                        <div className="prose prose-invert prose-sm max-w-none">
                            <div className="whitespace-pre-wrap text-gray-200 leading-relaxed font-outfit">
                                {aiResponse}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                {aiResponse && !isProcessingCommand && (
                    <div className="px-4 py-3 bg-dark-900/50 border-t border-white/5 flex justify-end gap-2">
                        <button
                            onClick={handleCopy}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-gray-300 transition-smooth border border-white/5"
                        >
                            {copied ? <Check className="w-3 h-3 text-accent-success" /> : <Copy className="w-3 h-3" />}
                            {copied ? 'Copied' : 'Copy Response'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
