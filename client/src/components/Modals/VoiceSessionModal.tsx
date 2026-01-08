import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X, Mic, MicOff, Volume2, Loader2, Sparkles } from 'lucide-react'

interface VoiceSessionModalProps {
    isOpen: boolean
    onClose: () => void
    meetingId: string
    meetingTitle: string
}

type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking'

export default function VoiceSessionModal({ isOpen, onClose, meetingId, meetingTitle }: VoiceSessionModalProps) {
    const [mounted, setMounted] = useState(false)
    const [state, setState] = useState<VoiceState>('idle')
    const [transcript, setTranscript] = useState('')
    const [aiResponse, setAiResponse] = useState('')
    const [error, setError] = useState<string | null>(null)

    const recognitionRef = useRef<any>(null)
    const synthesisRef = useRef<SpeechSynthesis | null>(null)

    // Handle client-side mounting for Portal
    useEffect(() => {
        setMounted(true)
        return () => setMounted(false)
    }, [])

    // Initialize Speech APIs
    useEffect(() => {
        if (typeof window !== 'undefined') {
            // Speech Recognition
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
            if (SpeechRecognition) {
                recognitionRef.current = new SpeechRecognition()
                recognitionRef.current.continuous = false
                recognitionRef.current.interimResults = false
                recognitionRef.current.lang = 'en-US'

                recognitionRef.current.onstart = () => setState('listening')
                recognitionRef.current.onend = () => {
                    // Only switch to idle if we haven't moved to processing (i.e. if user stopped talking but no result yet, or manual stop)
                    // But usually onresult fires before onend.
                }

                recognitionRef.current.onresult = (event: any) => {
                    const text = event.results[0][0].transcript
                    setTranscript(text)
                    if (text.trim()) {
                        processQuery(text)
                    }
                }

                recognitionRef.current.onerror = (event: any) => {
                    console.error('Speech recognition error', event.error)
                    setError('Could not hear you. Please try again.')
                    setState('idle')
                }
            }

            // Speech Synthesis
            synthesisRef.current = window.speechSynthesis
        }

        return () => {
            if (recognitionRef.current) recognitionRef.current.abort()
            if (synthesisRef.current) synthesisRef.current.cancel()
        }
    }, [])

    // Auto-start listening when modal opens
    useEffect(() => {
        if (isOpen) {
            setError(null)
            setTranscript('')
            setAiResponse('')
            startListening()
        } else {
            stopListening()
            if (synthesisRef.current) synthesisRef.current.cancel()
        }
    }, [isOpen])

    const startListening = () => {
        if (recognitionRef.current) {
            try {
                recognitionRef.current.start()
                setState('listening')
                setError(null)
            } catch (e) {
                // Already started
            }
        } else {
            setError('Speech recognition not supported in this browser.')
        }
    }

    const stopListening = () => {
        if (recognitionRef.current) {
            recognitionRef.current.stop()
        }
    }

    const processQuery = async (text: string) => {
        setState('processing')
        try {
            const res = await fetch('http://localhost:5000/api/chat/query', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ meetingId, query: text })
            })
            const data = await res.json()

            if (data.response) {
                setAiResponse(data.response)
                speakResponse(data.response)
            } else {
                throw new Error('No response from AI')
            }
        } catch (err) {
            console.error(err)
            setError('Failed to connect to AI.')
            setState('idle')
        }
    }

    const speakResponse = (text: string) => {
        if (!synthesisRef.current) return

        // Strip markdown symbols for cleaner speech
        const cleanText = text.replace(/[*#_`]/g, '')

        const utterance = new SpeechSynthesisUtterance(cleanText)
        utterance.onstart = () => setState('speaking')
        utterance.onend = () => {
            setState('idle')
            // Optional: Auto-listen again after a delay? 
            // For now, let's keep it manual or user-guided to avoid loops.
        }

        // Choose a nice voice if available
        const voices = synthesisRef.current.getVoices()
        const preferredVoice = voices.find(v => v.name.includes('Google US English') || v.name.includes('Samantha'))
        if (preferredVoice) utterance.voice = preferredVoice

        synthesisRef.current.speak(utterance)
    }

    if (!isOpen || !mounted) return null

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative w-full max-w-lg overflow-hidden bg-dark-900 border border-white/10 rounded-3xl shadow-2xl">

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors z-10"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Content */}
                <div className="flex flex-col items-center justify-center p-12 space-y-8 text-center">

                    {/* Header */}
                    <div className="space-y-2">
                        <h3 className="text-xl font-semibold text-white tracking-wide flex items-center justify-center gap-2">
                            <Sparkles className="w-5 h-5 text-accent-primary animate-pulse" />
                            Voice Mode
                        </h3>
                        <p className="text-sm text-gray-400 font-medium">
                            {meetingTitle}
                        </p>
                    </div>

                    {/* Visualizer / Orb */}
                    <div className="relative flex items-center justify-center w-32 h-32">
                        {/* Pulsing Rings */}
                        {state === 'listening' && (
                            <>
                                <div className="absolute inset-0 bg-accent-primary/20 rounded-full animate-ping" />
                                <div className="absolute inset-0 bg-accent-primary/10 rounded-full animate-ping delay-100" />
                            </>
                        )}

                        {state === 'processing' && (
                            <div className="absolute inset-0 border-4 border-t-accent-primary border-r-accent-primary/50 border-white/5 rounded-full animate-spin" />
                        )}

                        {state === 'speaking' && (
                            <div className="absolute inset-0 bg-accent-secondary/20 rounded-full animate-pulse duration-1000" />
                        )}

                        {/* Main Icon Circle */}
                        <div className={`
              relative z-10 flex items-center justify-center w-24 h-24 rounded-full border-2 transition-all duration-500
              ${state === 'listening' ? 'bg-accent-primary border-accent-primary shadow-lg shadow-accent-primary/40' : ''}
              ${state === 'processing' ? 'bg-dark-800 border-white/10' : ''}
              ${state === 'speaking' ? 'bg-accent-secondary border-accent-secondary shadow-lg shadow-accent-secondary/40' : ''}
              ${state === 'idle' ? 'bg-dark-800 border-white/10 hover:border-accent-primary/50' : ''}
            `}>
                            {state === 'listening' && <Mic className="w-10 h-10 text-white" />}
                            {state === 'processing' && <Loader2 className="w-10 h-10 text-accent-primary animate-spin" />}
                            {state === 'speaking' && <Volume2 className="w-10 h-10 text-white animate-pulse" />}
                            {state === 'idle' && <MicOff className="w-10 h-10 text-gray-500" />}
                        </div>
                    </div>

                    {/* Status Text & Transcript */}
                    <div className="space-y-4 max-w-sm">
                        <div className="h-6">
                            {state === 'listening' && <span className="text-accent-primary font-medium animate-pulse">Listening...</span>}
                            {state === 'processing' && <span className="text-gray-400 font-medium">Processing...</span>}
                            {state === 'speaking' && <span className="text-accent-secondary font-medium">Speaking...</span>}
                            {state === 'idle' && !error && <span className="text-gray-500 text-sm">Tap mic to speak</span>}
                            {error && <span className="text-red-400 text-sm">{error}</span>}
                        </div>

                        <div className="min-h-[60px] flex items-center justify-center">
                            {transcript && state !== 'speaking' && (
                                <p className="text-lg text-white font-medium leading-relaxed animate-in slide-in-from-bottom-2">
                                    "{transcript}"
                                </p>
                            )}
                            {state === 'speaking' && (
                                <p className="text-lg text-gray-200 font-medium leading-relaxed animate-in slide-in-from-bottom-2 line-clamp-3">
                                    {aiResponse}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="pt-4">
                        {state === 'idle' ? (
                            <button
                                onClick={startListening}
                                className="px-6 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-sm font-medium text-white transition-all"
                            >
                                Start Speaking
                            </button>
                        ) : (
                            <button
                                onClick={() => {
                                    stopListening()
                                    if (synthesisRef.current) synthesisRef.current.cancel()
                                    setState('idle')
                                }}
                                className="px-6 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-full text-sm font-medium text-red-400 transition-all"
                            >
                                Stop
                            </button>
                        )}
                    </div>

                </div>
            </div>
        </div>,
        document.body
    )
}
