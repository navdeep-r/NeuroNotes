import { Sparkles, Copy, Check, Send, Paperclip, Bot, User, Minimize2 } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { useAppState, useAppActions } from '../../context/AppContext'

/**
 * AIResponseDisplay - Modern Floating Chat Interface for Gemini Intelligence
 */
export default function AIResponseDisplay() {
    const { aiResponse, isProcessingCommand, chatHistory } = useAppState()
    const { setAiResponse, executeCommand } = useAppActions()
    const [copied, setCopied] = useState(false)
    const [inputValue, setInputValue] = useState('')

    const messagesEndRef = useRef<HTMLDivElement>(null)

    // Scroll to bottom when response updates or history changes
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
        }
    }, [aiResponse, isProcessingCommand, chatHistory])

    if (chatHistory.length === 0 && !isProcessingCommand && !aiResponse) return null

    const handleSend = () => {
        if (inputValue.trim()) {
            executeCommand(inputValue)
            setInputValue('')
        }
    }

    return (
        <div className="fixed bottom-6 right-6 w-[400px] md:w-[480px] h-[600px] max-h-[80vh] z-50 flex flex-col font-sans">
            {/* Glassmorphism Container */}
            <div className="relative flex flex-col h-full w-full overflow-hidden rounded-2xl border border-white/10 bg-dark-950/80 backdrop-blur-xl shadow-2xl shadow-accent-primary/10 animate-in slide-in-from-bottom-4 duration-300">

                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-accent-primary/20 via-transparent to-transparent border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <div className="absolute inset-0 bg-accent-primary rounded-full blur opacity-50 animate-pulse" />
                            <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-accent-primary to-accent-secondary border border-white/20">
                                <Sparkles className="w-4 h-4 text-white" />
                            </div>
                        </div>
                        <div className="flex flex-col">
                            <h3 className="text-sm font-bold text-white tracking-wide">NeuroNotes AI</h3>
                            <span className="text-[10px] text-accent-primary uppercase tracking-wider font-semibold flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-accent-success animate-pulse" />
                                Live Intelligence
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setAiResponse(null)}
                            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-all duration-200"
                        >
                            <Minimize2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Chat Area */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-6 bg-gradient-to-b from-transparent to-black/20">

                    {/* Timestamp Separator (Mock) */}
                    <div className="flex justify-center">
                        <span className="px-3 py-1 text-[10px] font-medium text-gray-500 bg-white/5 rounded-full backdrop-blur-sm border border-white/5">
                            Today, {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>

                    {/* Chat History */}
                    {chatHistory.map((msg) => (
                        <div key={msg.id} className="flex gap-4 group">
                            {msg.role === 'assistant' ? (
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-dark-800 border border-white/10 flex items-center justify-center mt-1">
                                    <Bot className="w-5 h-5 text-accent-primary" />
                                </div>
                            ) : (
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-accent-primary border border-white/10 flex items-center justify-center mt-1">
                                    <User className="w-5 h-5 text-white" />
                                </div>
                            )}

                            <div className="flex-1 space-y-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-semibold text-gray-300">
                                        {msg.role === 'assistant' ? 'NeuroNotes' : 'You'}
                                    </span>
                                    <span className="text-[10px] text-gray-500">
                                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>

                                <div className={`relative rounded-2xl rounded-tl-sm border border-white/5 p-4 shadow-sm group-hover:shadow-md transition-all duration-300 ${msg.role === 'assistant' ? 'bg-dark-800/80 backdrop-blur-md' : 'bg-white/5'
                                    }`}>
                                    <div className="prose prose-invert prose-sm max-w-none">
                                        <div className="whitespace-pre-wrap text-gray-200 leading-relaxed font-outfit">
                                            {msg.content}
                                        </div>
                                    </div>

                                    {/* Metadata / Provenance Badge */}
                                    {msg.metadata && (
                                        <div className="mt-3 pt-3 border-t border-white/5 space-y-2">
                                            <div className="flex items-center gap-2 text-[10px] text-gray-400 font-medium uppercase tracking-wider">
                                                <Sparkles className="w-3 h-3 text-accent-secondary" />
                                                <span>AI Provenance</span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="bg-white/5 rounded p-2 border border-white/5">
                                                    <span className="block text-[9px] text-gray-500 uppercase">Context Window</span>
                                                    <span className="text-xs text-gray-300 font-mono">{msg.metadata.window}</span>
                                                </div>
                                                <div className="bg-white/5 rounded p-2 border border-white/5">
                                                    <span className="block text-[9px] text-gray-500 uppercase">Confidence</span>
                                                    <span className="text-xs text-accent-success font-mono">{(msg.metadata.confidence * 100).toFixed(0)}%</span>
                                                </div>
                                                {msg.metadata.speakers.length > 0 && (
                                                    <div className="col-span-2 bg-white/5 rounded p-2 border border-white/5">
                                                        <span className="block text-[9px] text-gray-500 uppercase">Sources</span>
                                                        <span className="text-xs text-gray-300 truncate block">
                                                            {msg.metadata.speakers.join(', ')}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Copy Button (Only for AI) */}
                                    {msg.role === 'assistant' && (
                                        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-white/5">
                                            <button
                                                onClick={() => {
                                                    navigator.clipboard.writeText(msg.content)
                                                    setCopied(true)
                                                    setTimeout(() => setCopied(false), 2000)
                                                }}
                                                className="flex items-center gap-1.5 text-[10px] font-medium text-gray-400 hover:text-white transition-colors"
                                            >
                                                {copied ? <Check className="w-3 h-3 text-accent-success" /> : <Copy className="w-3 h-3" />}
                                                {copied ? 'Copied' : 'Copy'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Loading Indicator */}
                    {isProcessingCommand && !aiResponse && (
                        <div className="flex gap-4 group">
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-dark-800 border border-white/10 flex items-center justify-center mt-1">
                                <Bot className="w-5 h-5 text-accent-primary" />
                            </div>
                            <div className="flex items-center gap-1 p-4 bg-dark-800/50 rounded-2xl rounded-tl-sm border border-white/5 w-fit">
                                <div className="w-2 h-2 bg-accent-primary/50 rounded-full animate-bounce delay-0" />
                                <div className="w-2 h-2 bg-accent-primary/50 rounded-full animate-bounce delay-150" />
                                <div className="w-2 h-2 bg-accent-primary/50 rounded-full animate-bounce delay-300" />
                            </div>
                        </div>
                    )}

                    {/* Streaming/Status Response */}
                    {aiResponse && (
                        <div className="flex gap-4 group">
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-dark-800 border border-white/10 flex items-center justify-center mt-1">
                                <Bot className="w-5 h-5 text-accent-primary" />
                            </div>

                            <div className="flex-1 space-y-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-semibold text-gray-300">NeuroNotes</span>
                                </div>

                                <div className="relative bg-dark-800/80 backdrop-blur-md rounded-2xl rounded-tl-sm border border-white/5 p-4 shadow-sm group-hover:shadow-md transition-all duration-300">
                                    <div className="prose prose-invert prose-sm max-w-none">
                                        <div className="whitespace-pre-wrap text-gray-200 leading-relaxed font-outfit">
                                            {aiResponse}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 bg-dark-900 border-t border-white/5 backdrop-blur-lg">
                    <div className="relative flex items-center gap-2 p-2 bg-dark-800/50 border border-white/10 rounded-xl focus-within:border-accent-primary/50 focus-within:ring-1 focus-within:ring-accent-primary/50 transition-all duration-300">
                        <button className="p-2 text-gray-400 hover:text-accent-primary hover:bg-accent-primary/10 rounded-lg transition-colors">
                            <Paperclip className="w-4 h-4" />
                        </button>

                        <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder="Ask a follow-up question..."
                            className="flex-1 bg-transparent border-none outline-none text-sm text-white placeholder-gray-500 min-w-0"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    handleSend()
                                }
                            }}
                        />

                        <button
                            onClick={handleSend}
                            className={`p-2 rounded-lg transition-all duration-300 ${inputValue.trim()
                                ? 'bg-accent-primary text-white shadow-lg shadow-accent-primary/20'
                                : 'bg-white/5 text-gray-500 hover:text-gray-300'
                                }`}
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </div>
                </div>

            </div>
        </div>
    )
}
