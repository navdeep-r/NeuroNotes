import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X, Mic, MicOff, Volume2, Sparkles, AlertCircle } from 'lucide-react'
import VoiceVisualizer from '../Voice/VoiceVisualizer'

interface VoiceSessionModalProps {
    isOpen: boolean
    onClose: () => void
    meetingId: string
    meetingTitle: string
}

export default function VoiceSessionModal({ isOpen, onClose, meetingId, meetingTitle }: VoiceSessionModalProps) {
    const [mounted, setMounted] = useState(false)
    const [state, setState] = useState<'idle' | 'listening' | 'processing' | 'speaking'>('idle')
    const [aiResponse, setAiResponse] = useState<string>('')
    const [error, setError] = useState<string | null>(null)

    // Audio Refs
    const recognitionRef = useRef<any>(null)
    const mediaStreamRef = useRef<MediaStream | null>(null)
    const audioRef = useRef<HTMLAudioElement | null>(null)
    const silenceTimerRef = useRef<NodeJS.Timeout | null>(null)

    useEffect(() => {
        setMounted(true)
        return () => setMounted(false)
    }, [])

    useEffect(() => {
        if (isOpen) {
            startListening()
        } else {
            stopListening()
            stopAudioPlayback()
        }
        return () => {
            stopListening()
            stopAudioPlayback()
        }
    }, [isOpen])

    const startListening = async () => {
        setError(null)
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            mediaStreamRef.current = stream

            // 2. Start Speech Recognition
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
            if (!SpeechRecognition) {
                setError('Browser does not support Voice Recognition.')
                return
            }

            const recognition = new SpeechRecognition()
            recognition.continuous = false
            recognition.interimResults = false
            recognition.lang = 'en-US'

            recognition.onstart = () => {
                setState('listening')
            }

            recognition.onresult = (event: any) => {
                const transcript = event.results[0][0].transcript
                setState('processing')
                processQuery(transcript)
            }

            recognition.onerror = (event: any) => {
                console.error('Speech error', event.error)
                if (event.error === 'no-speech') {
                    setState('idle')
                } else if (event.error === 'network') {
                    setError('Network error (Speech API unreachable). Please check connection.')
                    setState('idle')
                } else if (event.error === 'not-allowed') {
                    setError('Microphone permission denied.')
                    setState('idle')
                } else {
                    setError(`Voice error: ${event.error}`)
                    setState('idle')
                }
            }

            recognition.onend = () => {
                if (state === 'listening') {
                    setState('idle')
                }
            }

            recognitionRef.current = recognition

            // Small delay to allow mic stream to settle + prevent race conditions
            setTimeout(() => {
                try {
                    if (recognitionRef.current) recognition.start()
                } catch (e) {
                    console.error("Failed to start recognition", e)
                }
            }, 100)

        } catch (err) {
            console.error('Failed to access microphone', err)
            setError('Microphone access denied or not available.')
        }
    }

    const stopListening = () => {
        if (recognitionRef.current) {
            recognitionRef.current.stop()
            recognitionRef.current = null
        }

        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop())
            mediaStreamRef.current = null
        }

        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
    }

    const stopAudioPlayback = () => {
        if (audioRef.current) {
            audioRef.current.pause()
            audioRef.current = null
        }
    }

    const processQuery = async (text: string) => {
        setState('processing')
        try {
            const res = await fetch('http://localhost:5000/api/voice/interact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ meetingId, query: text })
            })

            if (!res.ok) throw new Error('API Error')

            const data = await res.json()

            if (data.text && data.audio) {
                console.log('[VoiceSession] Received Audio Response. Length:', data.audio.length)
                setAiResponse(data.text)
                playAudioResponse(data.audio)
            } else {
                throw new Error('Invalid response format')
            }
        } catch (err) {
            console.error(err)
            setError('Failed to connect to AI.')
            setState('idle')
        }
    }

    const playAudioResponse = (base64Audio: string) => {
        try {
            if (audioRef.current) audioRef.current.pause();

            console.log('[VoiceSession] Creating Audio object...')
            const audio = new Audio(`data:audio/mpeg;base64,${base64Audio}`)
            audioRef.current = audio;

            audio.onloadedmetadata = () => {
                console.log('[VoiceSession] Audio metadata loaded. Duration:', audio.duration)
            }

            audio.onplay = () => {
                console.log('[VoiceSession] Audio started playing')
                setState('speaking')
            }

            audio.onended = () => {
                console.log('[VoiceSession] Audio ended')
                setState('idle')
            }

            audio.onerror = (e) => {
                console.error('[VoiceSession] Audio playback error', (e.target as HTMLAudioElement).error)
                setError('Failed to play audio response')
                setState('idle')
            }

            const playPromise = audio.play()
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.error('[VoiceSession] Playback prevented:', error)
                });
            }
        } catch (e) {
            console.error('Audio reconstruction error', e)
            setState('idle')
        }
    }


    if (!isOpen || !mounted) return null

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="relative w-full max-w-2xl bg-dark-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col items-center">

                {/* Header */}
                <div className="absolute top-0 w-full p-4 flex justify-between items-center z-10 bg-gradient-to-b from-black/50 to-transparent">
                    <div className="flex items-center gap-2 text-white/50 text-sm">
                        <Sparkles className="w-4 h-4 text-accent-primary" />
                        <span>Voice Session • {meetingTitle}</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Main Visualizer Area */}
                <div className="w-full h-80 bg-gradient-to-b from-dark-950 to-dark-900 flex items-center justify-center relative">
                    <VoiceVisualizer
                        mode={state}
                        audioStream={mediaStreamRef.current}
                        audioElement={audioRef.current}
                    />

                    {/* Status Text Overlay */}
                    <div className="absolute bottom-6 text-center animate-in slide-in-from-bottom-2 fade-in">
                        <p className={`text-lg font-medium tracking-wide ${state === 'listening' ? 'text-accent-primary animate-pulse' :
                            state === 'processing' ? 'text-purple-400' :
                                state === 'speaking' ? 'text-cyan-400' : 'text-gray-500'
                            }`}>
                            {state === 'listening' && 'Listening...'}
                            {state === 'processing' && 'Thinking...'}
                            {state === 'speaking' && 'Speaking...'}
                            {state === 'idle' && 'Ready'}
                        </p>
                    </div>
                </div>

                {/* AI Text Response Display */}
                <div className="w-full p-6 bg-dark-900 border-t border-white/5 min-h-[120px]">
                    {error ? (
                        <div className="flex items-center justify-center gap-2 text-red-400">
                            <AlertCircle className="w-5 h-5" />
                            <p>{error}</p>
                        </div>
                    ) : (
                        <p className="text-center text-gray-300 text-lg leading-relaxed font-light">
                            {aiResponse || "Tap the microphone to start speaking..."}
                        </p>
                    )}
                </div>

                {/* Controls */}
                <div className="p-6 w-full flex flex-col items-center justify-center gap-4 bg-dark-950/50">
                    {/* Error Message (centered above controls) */}
                    {error && (
                        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 bg-red-500/10 px-4 py-2 rounded-full border border-red-500/20 mb-2">
                            <AlertCircle className="w-4 h-4 text-red-400" />
                            <span className="text-red-400 text-xs font-medium">{error}</span>
                        </div>
                    )}

                    <div className="flex items-center gap-3 w-full max-w-md">
                        <button
                            onClick={() => state === 'listening' ? stopListening() : startListening()}
                            className={`flex-shrink-0 p-4 rounded-full transition-all duration-300 transform hover:scale-105 ${state === 'listening'
                                ? 'bg-red-500/20 text-red-500 border border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.3)]'
                                : 'bg-accent-primary text-dark-950 shadow-[0_0_20px_rgba(56,189,248,0.4)] hover:shadow-[0_0_30px_rgba(56,189,248,0.6)]'
                                }`}
                        >
                            {state === 'listening' ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                        </button>

                        {/* Text Input Fallback */}
                        <form
                            onSubmit={(e) => {
                                e.preventDefault()
                                const form = e.target as HTMLFormElement
                                const input = form.elements.namedItem('query') as HTMLInputElement
                                if (input.value.trim()) {
                                    if (state === 'listening') stopListening()
                                    processQuery(input.value)
                                    input.value = ''
                                }
                            }}
                            className="flex-1"
                        >
                            <input
                                name="query"
                                type="text"
                                placeholder="Type a message..."
                                className="w-full bg-white/5 border border-white/10 rounded-full px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-accent-primary/50 focus:bg-white/10 transition-all text-sm backdrop-blur-md"
                                autoComplete="off"
                            />
                        </form>
                    </div>
                </div>

            </div>
        </div>,
        document.body
    )
}
