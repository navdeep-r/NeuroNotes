import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X, Mic, MicOff, Sparkles, AlertCircle } from 'lucide-react'

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
    const [videosLoaded, setVideosLoaded] = useState(false)

    // Audio Refs
    const recognitionRef = useRef<any>(null)
    const mediaStreamRef = useRef<MediaStream | null>(null)
    const audioRef = useRef<HTMLAudioElement | null>(null)
    const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    // Video Refs
    const listeningVideoRef = useRef<HTMLVideoElement>(null)
    const speakingVideoRef = useRef<HTMLVideoElement>(null)

    // State ref to avoid stale closures in event handlers
    const stateRef = useRef(state)
    stateRef.current = state

    useEffect(() => {
        setMounted(true)
        return () => setMounted(false)
    }, [])

    // Preload videos
    useEffect(() => {
        if (!isOpen) return

        const loadVideos = async () => {
            const listeningVideo = listeningVideoRef.current
            const speakingVideo = speakingVideoRef.current

            if (listeningVideo && speakingVideo) {
                listeningVideo.load()
                speakingVideo.load()

                // Wait for both to be ready
                await Promise.all([
                    new Promise(resolve => {
                        listeningVideo.oncanplaythrough = resolve
                    }),
                    new Promise(resolve => {
                        speakingVideo.oncanplaythrough = resolve
                    })
                ])

                setVideosLoaded(true)
            }
        }

        loadVideos()
    }, [isOpen])

    // Control video playback based on state
    useEffect(() => {
        const listeningVideo = listeningVideoRef.current
        const speakingVideo = speakingVideoRef.current

        if (!listeningVideo || !speakingVideo) return

        if (state === 'listening' || state === 'processing') {
            // Play listening video (looped)
            speakingVideo.pause()
            speakingVideo.currentTime = 0
            listeningVideo.play().catch(() => { })
        } else if (state === 'speaking') {
            // Play speaking video
            listeningVideo.pause()
            speakingVideo.currentTime = 0
            speakingVideo.play().catch(() => { })
        } else {
            // Idle - pause both, show first frame
            listeningVideo.pause()
            listeningVideo.currentTime = 0
            speakingVideo.pause()
            speakingVideo.currentTime = 0
        }
    }, [state])

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
                    setError('Network error. Please check connection.')
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
                if (stateRef.current === 'listening') {
                    setState('idle')
                }
            }

            recognitionRef.current = recognition

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

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}))
                throw new Error(errorData.error || `API Error: ${res.status}`)
            }

            const data = await res.json()

            if (data.text && data.audio) {
                setAiResponse(data.text)
                playAudioResponse(data.audio)
            } else if (data.text) {
                setAiResponse(data.text)
                setState('idle')
            } else {
                throw new Error('Invalid response format')
            }
        } catch (err: any) {
            console.error('[VoiceSession] Error:', err)
            setError(err.message || 'Failed to connect to AI.')
            setState('idle')
        }
    }

    const playAudioResponse = (base64Audio: string) => {
        try {
            if (audioRef.current) audioRef.current.pause()

            const audio = new Audio(`data:audio/mpeg;base64,${base64Audio}`)
            audioRef.current = audio

            setState('speaking')

            audio.onended = () => {
                setState('idle')
                startListening()
            }

            audio.onerror = () => {
                setError('Audio playback failed')
                setState('idle')
            }

            audio.play().catch(error => {
                if (error.name === 'NotAllowedError') {
                    setError('Click anywhere to enable audio.')
                }
                setState('idle')
            })
        } catch (e) {
            console.error('Audio error', e)
            setState('idle')
        }
    }

    if (!isOpen || !mounted) return null

    const isMicActive = state === 'listening'
    const isMicDisabled = state === 'processing' || state === 'speaking'

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
            <div className="relative w-full max-w-2xl bg-dark-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col items-center">

                {/* Header */}
                <div className="absolute top-0 w-full p-4 flex justify-between items-center z-20 bg-gradient-to-b from-black/70 to-transparent">
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

                {/* Video Visualizer Area */}
                <div className="w-full h-80 bg-dark-950 flex items-center justify-center relative overflow-hidden">
                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/50 z-10 pointer-events-none" />

                    {/* Loading state */}
                    {!videosLoaded && (
                        <div className="absolute inset-0 flex items-center justify-center bg-dark-950 z-20">
                            <div className="w-16 h-16 border-4 border-accent-primary/30 border-t-accent-primary rounded-full animate-spin" />
                        </div>
                    )}

                    {/* Listening/Processing Video */}
                    <video
                        ref={listeningVideoRef}
                        src="/videos/ai-voice-mode.mp4"
                        muted
                        loop
                        playsInline
                        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${state === 'speaking' ? 'opacity-0' : 'opacity-100'
                            }`}
                    />

                    {/* Speaking Video - Loops while AI is speaking */}
                    <video
                        ref={speakingVideoRef}
                        src="/videos/ai-voice-sent.mp4"
                        muted
                        loop
                        playsInline
                        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${state === 'speaking' ? 'opacity-100' : 'opacity-0'
                            }`}
                    />

                    {/* Status Text Overlay */}
                    <div className="absolute bottom-6 z-20 text-center animate-in slide-in-from-bottom-2 fade-in">
                        <p className={`text-lg font-medium tracking-wide drop-shadow-lg ${state === 'listening' ? 'text-green-400' :
                            state === 'processing' ? 'text-purple-400' :
                                    state === 'speaking' ? 'text-cyan-400' : 'text-gray-400'
                            }`}>
                            {state === 'listening' && '🎙️ Listening...'}
                            {state === 'processing' && '✨ Thinking...'}
                            {state === 'speaking' && '🔊 Speaking...'}
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
                    {error && (
                        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 bg-red-500/10 px-4 py-2 rounded-full border border-red-500/20 mb-2">
                            <AlertCircle className="w-4 h-4 text-red-400" />
                            <span className="text-red-400 text-xs font-medium">{error}</span>
                        </div>
                    )}

                    <div className="flex items-center gap-3 w-full max-w-md">
                        <button
                            onClick={() => isMicActive ? stopListening() : startListening()}
                            disabled={isMicDisabled}
                            className={`flex-shrink-0 p-4 rounded-full transition-all duration-300 transform hover:scale-105 
                                ${isMicActive
                                    ? 'bg-green-500 text-white shadow-[0_0_20px_rgba(34,197,94,0.5)] animate-pulse'
                                    : isMicDisabled
                                        ? 'bg-gray-600/50 text-gray-400 cursor-not-allowed'
                                    : 'bg-accent-primary text-dark-950 shadow-[0_0_20px_rgba(99,102,241,0.4)] hover:shadow-[0_0_30px_rgba(99,102,241,0.6)]'
                                }`}
                            title={isMicActive ? 'Stop listening' : isMicDisabled ? 'Agent is responding...' : 'Start listening'}
                        >
                            {isMicDisabled ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                        </button>

                        <form
                            onSubmit={(e) => {
                                e.preventDefault()
                                const form = e.target as HTMLFormElement
                                const input = form.elements.namedItem('query') as HTMLInputElement
                                if (input.value.trim()) {
                                    if (isMicActive) stopListening()
                                    processQuery(input.value)
                                    input.value = ''
                                }
                            }}
                            className="flex-1"
                        >
                            <input
                                name="query"
                                type="text"
                                placeholder={isMicDisabled ? "Agent is responding..." : "Type a message..."}
                                disabled={isMicDisabled}
                                className="w-full bg-white/5 border border-white/10 rounded-full px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-accent-primary/50 focus:bg-white/10 transition-all text-sm backdrop-blur-md disabled:opacity-50 disabled:cursor-not-allowed"
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
