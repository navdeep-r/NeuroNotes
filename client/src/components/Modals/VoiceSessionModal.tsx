import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X, Mic, MicOff, Sparkles, AlertCircle, Brain } from 'lucide-react'

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

    // State ref to avoid stale closures
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

                await Promise.all([
                    new Promise(resolve => { listeningVideo.oncanplaythrough = resolve }),
                    new Promise(resolve => { speakingVideo.oncanplaythrough = resolve })
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
            speakingVideo.pause()
            speakingVideo.currentTime = 0
            listeningVideo.play().catch(() => { })
        } else if (state === 'speaking') {
            listeningVideo.pause()
            speakingVideo.currentTime = 0
            speakingVideo.play().catch(() => { })
        } else {
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

            recognition.onstart = () => setState('listening')

            recognition.onresult = (event: any) => {
                const transcript = event.results[0][0].transcript
                setState('processing')
                processQuery(transcript)
            }

            recognition.onerror = (event: any) => {
                if (event.error === 'no-speech') {
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
                if (stateRef.current === 'listening') setState('idle')
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
            setError('Microphone access denied.')
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
                throw new Error('Invalid response')
            }
        } catch (err: any) {
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
                // Stop speaking video when audio ends
                if (speakingVideoRef.current) {
                    speakingVideoRef.current.pause()
                }
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
            setState('idle')
        }
    }

    if (!isOpen || !mounted) return null

    const isMicActive = state === 'listening'
    const isMicDisabled = state === 'processing' || state === 'speaking'

    // State colors and labels
    const stateConfig = {
        idle: { color: 'text-gray-400', glow: 'rgba(100, 100, 100, 0.2)', label: 'Ready to Listen' },
        listening: { color: 'text-green-400', glow: 'rgba(34, 197, 94, 0.4)', label: '🎙️ Listening...' },
        processing: { color: 'text-purple-400', glow: 'rgba(139, 92, 246, 0.4)', label: '✨ Processing...' },
        speaking: { color: 'text-cyan-400', glow: 'rgba(34, 211, 238, 0.4)', label: '🔊 AI Speaking...' }
    }

    const currentConfig = stateConfig[state]

    return createPortal(
        <div className="fixed inset-0 z-[100] flex flex-col bg-black animate-in fade-in duration-500">

            {/* Ambient Background Glow */}
            <div
                className="absolute inset-0 transition-all duration-700 pointer-events-none"
                style={{
                    background: `radial-gradient(ellipse 80% 60% at 50% 40%, ${currentConfig.glow} 0%, transparent 70%)`
                }}
            />

            {/* Header */}
            <div className="relative z-30 flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <div
                            className="absolute inset-0 rounded-full blur-md transition-all duration-500"
                            style={{ backgroundColor: currentConfig.glow }}
                        />
                        <div className="relative flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-accent-primary to-purple-600 border border-white/20">
                            <Brain className="w-5 h-5 text-white" />
                        </div>
                    </div>
                    <div>
                        <h2 className="text-white font-semibold">NeuroNotes Voice</h2>
                        <p className="text-xs text-gray-500">{meetingTitle}</p>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="p-2 text-gray-500 hover:text-white hover:bg-white/10 rounded-full transition-all"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Main Video Area - Full Screen Hero */}
            <div className="flex-1 relative flex items-center justify-center overflow-hidden">
                {/* Gradient overlays for depth */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/50 z-10 pointer-events-none" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-black/30 z-10 pointer-events-none" />

                {/* Loading state */}
                {!videosLoaded && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black z-20">
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-20 h-20 border-4 border-accent-primary/30 border-t-accent-primary rounded-full animate-spin" />
                            <p className="text-gray-500 text-sm">Initializing Voice Mode...</p>
                        </div>
                    </div>
                )}

                {/* Listening/Processing Video */}
                <video
                    ref={listeningVideoRef}
                    src="/videos/ai-voice-mode.mp4"
                    muted
                    loop
                    playsInline
                    className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-500 ${state === 'speaking' ? 'opacity-0' : 'opacity-100'
                        }`}
                />

                {/* Speaking Video - Now loops during audio playback */}
                <video
                    ref={speakingVideoRef}
                    src="/videos/ai-voice-sent.mp4"
                    muted
                    loop
                    playsInline
                    className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-500 ${state === 'speaking' ? 'opacity-100' : 'opacity-0'
                        }`}
                />

                {/* Centered State Indicator */}
                <div className="absolute z-20 flex flex-col items-center gap-4">
                    <div
                        className={`px-6 py-3 rounded-full backdrop-blur-xl border transition-all duration-500 ${state === 'idle' ? 'bg-white/5 border-white/10' :
                            state === 'listening' ? 'bg-green-500/10 border-green-500/30' :
                                state === 'processing' ? 'bg-purple-500/10 border-purple-500/30' :
                                    'bg-cyan-500/10 border-cyan-500/30'
                            }`}
                    >
                        <p className={`text-xl font-medium tracking-wide ${currentConfig.color}`}>
                            {currentConfig.label}
                        </p>
                    </div>
                </div>
            </div>

            {/* AI Response Display - Glassmorphism Panel */}
            <div className="relative z-20 px-6 py-4">
                <div className="max-w-3xl mx-auto bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl p-6 min-h-[100px]">
                    {error ? (
                        <div className="flex items-center justify-center gap-3 text-red-400">
                            <AlertCircle className="w-5 h-5" />
                            <p>{error}</p>
                        </div>
                    ) : (
                            <p className="text-center text-gray-200 text-lg leading-relaxed font-light">
                                {aiResponse || "Say something to start the conversation..."}
                        </p>
                    )}
                </div>
            </div>

            {/* Floating Controls - Glassmorphism Bar */}
            <div className="relative z-20 px-6 pb-8 pt-4">
                <div className="max-w-xl mx-auto flex items-center gap-4 p-4 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl">

                    {/* Microphone Button */}
                    <button
                        onClick={() => isMicActive ? stopListening() : startListening()}
                        disabled={isMicDisabled}
                        className={`relative flex-shrink-0 p-5 rounded-full transition-all duration-300 transform hover:scale-105 ${isMicActive
                            ? 'bg-green-500 text-white'
                            : isMicDisabled
                                ? 'bg-gray-700/50 text-gray-500 cursor-not-allowed'
                                : 'bg-gradient-to-br from-accent-primary to-purple-600 text-white hover:shadow-[0_0_40px_rgba(99,102,241,0.5)]'
                            }`}
                    >
                        {/* Glow effect */}
                        {isMicActive && (
                            <div className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-30" />
                        )}
                        {isMicDisabled ? <MicOff className="w-7 h-7" /> : <Mic className="w-7 h-7" />}
                    </button>

                    {/* Text Input */}
                    <form
                        onSubmit={(e) => {
                            e.preventDefault()
                            const input = (e.target as HTMLFormElement).elements.namedItem('query') as HTMLInputElement
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
                            placeholder={isMicDisabled ? "AI is responding..." : "Or type your question..."}
                            disabled={isMicDisabled}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-white placeholder-gray-500 focus:outline-none focus:border-accent-primary/50 focus:bg-white/10 transition-all backdrop-blur disabled:opacity-50 disabled:cursor-not-allowed"
                            autoComplete="off"
                        />
                    </form>
                </div>

                {/* Hint text */}
                <p className="text-center text-gray-600 text-xs mt-3">
                    Press <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-gray-400">Esc</kbd> to close
                </p>
            </div>

        </div>,
        document.body
    )
}
