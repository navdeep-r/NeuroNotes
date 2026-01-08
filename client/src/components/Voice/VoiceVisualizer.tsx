import { useEffect, useRef } from 'react'

interface VoiceVisualizerProps {
    mode: 'idle' | 'listening' | 'processing' | 'speaking'
    audioStream?: MediaStream | null
    audioElement?: HTMLAudioElement | null
}

export default function VoiceVisualizer({ mode, audioStream, audioElement }: VoiceVisualizerProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const requestRef = useRef<number>()
    const analyserRef = useRef<AnalyserNode | null>(null)
    const contextRef = useRef<AudioContext | null>(null)
    const sourceRef = useRef<MediaStreamAudioSourceNode | MediaElementAudioSourceNode | null>(null)

    // Initialize Audio Context & Analyzer
    useEffect(() => {
        if (!contextRef.current) {
            contextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
            analyserRef.current = contextRef.current.createAnalyser()
            analyserRef.current.fftSize = 256
            analyserRef.current.smoothingTimeConstant = 0.8
        }

        return () => {
            if (contextRef.current?.state !== 'closed') {
                contextRef.current?.close()
            }
        }
    }, [])

    // Connect Source based on Mode
    useEffect(() => {
        const ctx = contextRef.current
        const analyser = analyserRef.current
        if (!ctx || !analyser) return

        // Cleanup previous source
        if (sourceRef.current) {
            sourceRef.current.disconnect()
            sourceRef.current = null
        }

        try {
            if (mode === 'listening' && audioStream) {
                // Mic Input
                sourceRef.current = ctx.createMediaStreamSource(audioStream)
                sourceRef.current.connect(analyser)
            } else if (mode === 'speaking' && audioElement) {
                // AI Output
                if (!audioElement.src) return

                try {
                    // Create source only if we haven't tracked this specific element yet
                    // Note: MediaElementAudioSourceNode can only be created once per HTMLMediaElement.
                    // We need to manage this carefuly. 
                    // A safer pattern for React is to check if we already have a source for this element, 
                    // but since the element ref might change, we'll try-catch the creation.

                    // Disconnect old if exists (re-routing)
                    if (sourceRef.current) {
                        sourceRef.current.disconnect()
                    }

                    // Create new source
                    const source = ctx.createMediaElementSource(audioElement)
                    sourceRef.current = source

                    // Connect to Graph: Source -> Analyser -> Destination
                    source.connect(analyser)
                    source.connect(ctx.destination)

                } catch (e) {
                    // If we get an error, it usually means the element already has a source node.
                    // In a production app, we'd map elements to sources in a WeakMap context.
                    // For now, we log it. If it fails, audio usually still plays via normal browser behavior 
                    // UNLESS the previous source node disconnected it from destination.
                    console.warn('Re-using audio element source or failed to create:', e)
                }
            }
        } catch (err) {
            console.error('Error connecting audio source:', err)
        }

    }, [mode, audioStream, audioElement])

    // Animation Loop
    useEffect(() => {
        const canvas = canvasRef.current
        const analyser = analyserRef.current
        if (!canvas || !analyser) return

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const bufferLength = analyser.frequencyBinCount
        const dataArray = new Uint8Array(bufferLength)

        const draw = () => {
            const width = canvas.width
            const height = canvas.height

            // Clear
            ctx.clearRect(0, 0, width, height)

            // Get Data (if active)
            if (mode === 'listening' || mode === 'speaking') {
                analyser.getByteFrequencyData(dataArray)
            } else {
                // Zero out for processing/idle
                dataArray.fill(0)
            }

            // Draw Logic based on Mode
            if (mode === 'processing') {
                drawProcessingState(ctx, width, height)
            } else {
                drawWaveform(ctx, width, height, dataArray, mode)
            }

            requestRef.current = requestAnimationFrame(draw)
        }

        draw()

        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current)
        }
    }, [mode])

    // --- Drawing Helpers ---

    const drawProcessingState = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
        const time = Date.now() / 1000
        const cx = w / 2
        const cy = h / 2

        ctx.save()
        ctx.translate(cx, cy)

        // Rotating Orbit
        ctx.beginPath()
        ctx.arc(0, 0, 40, 0, Math.PI * 2)
        ctx.strokeStyle = 'rgba(120, 119, 198, 0.3)' // muted purple
        ctx.lineWidth = 2
        ctx.stroke()

        // Rotating Glow
        ctx.rotate(time * 2)
        ctx.beginPath()
        ctx.arc(40, 0, 4, 0, Math.PI * 2)
        ctx.fillStyle = '#a78bfa' // purple-400
        ctx.shadowBlur = 15
        ctx.shadowColor = '#a78bfa'
        ctx.fill()

        ctx.restore()
    }

    const drawWaveform = (ctx: CanvasRenderingContext2D, w: number, h: number, data: Uint8Array, mode: string) => {
        const cx = w / 2
        const cy = h / 2
        const radius = mode === 'speaking' ? 50 : 40
        const bars = 60
        const step = (Math.PI * 2) / bars

        ctx.save()
        ctx.translate(cx, cy)

        // Base Glow
        const color = mode === 'speaking' ? '#22d3ee' : '#a78bfa' // cyan vs purple
        ctx.shadowBlur = 20
        ctx.shadowColor = color

        // Draw Circular Frequency Bars
        for (let i = 0; i < bars; i++) {
            // Pick a frequency value (mapped loosely)
            const value = data[i * 2] || 0
            const percent = value / 255
            const barHeight = mode === 'idle' ? 2 : (percent * 60) + 4

            ctx.rotate(step)

            ctx.beginPath()
            ctx.fillStyle = color

            // Rounded Bar
            ctx.roundRect(-2, radius, 4, barHeight, 2)
            ctx.fill()

            // Mirror inner bar for "connected" look ?
            // ctx.roundRect(-2, radius - barHeight - 4, 4, barHeight, 2)
            // ctx.fill()
        }

        // Inner Circle
        ctx.beginPath()
        ctx.arc(0, 0, radius - 5, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(0,0,0,0.5)'
        ctx.fill()

        ctx.restore()
    }

    return (
        <canvas
            ref={canvasRef}
            width={400}
            height={300}
            className="w-full h-full"
        />
    )
}
