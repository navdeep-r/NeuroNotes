import { useState, useEffect } from 'react'
import './SplashScreen.css'

/**
 * NeuroNotes Logo - Neural network inspired SVG icon
 */
function NeuroNotesLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Primary gradient */}
        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="50%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#a855f7" />
        </linearGradient>
        
        {/* Glow filter */}
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      
      {/* Background circle */}
      <circle cx="50" cy="50" r="45" fill="url(#logoGradient)" opacity="0.1" />
      
      {/* Neural network nodes */}
      <g fill="url(#logoGradient)" filter="url(#glow)">
        {/* Central brain core */}
        <circle cx="50" cy="50" r="12" />
        
        {/* Outer nodes */}
        <circle cx="50" cy="20" r="6" />
        <circle cx="80" cy="35" r="6" />
        <circle cx="80" cy="65" r="6" />
        <circle cx="50" cy="80" r="6" />
        <circle cx="20" cy="65" r="6" />
        <circle cx="20" cy="35" r="6" />
      </g>
      
      {/* Connection lines */}
      <g stroke="url(#logoGradient)" strokeWidth="2" fill="none" opacity="0.6">
        <line x1="50" y1="38" x2="50" y2="26" />
        <line x1="60" y1="44" x2="74" y2="38" />
        <line x1="60" y1="56" x2="74" y2="62" />
        <line x1="50" y1="62" x2="50" y2="74" />
        <line x1="40" y1="56" x2="26" y2="62" />
        <line x1="40" y1="44" x2="26" y2="38" />
      </g>
      
      {/* Outer ring */}
      <circle 
        cx="50" 
        cy="50" 
        r="42" 
        fill="none" 
        stroke="url(#logoGradient)" 
        strokeWidth="1.5" 
        opacity="0.3"
        strokeDasharray="8 4"
      />
    </svg>
  )
}

interface SplashScreenProps {
  onComplete: () => void
  duration?: number
}

/**
 * SplashScreen - Premium intro animation for NeuroNotes
 * Displays logo reveal and typing animation before transitioning to main app
 */
export default function SplashScreen({ onComplete, duration = 3500 }: SplashScreenProps) {
  const [isExiting, setIsExiting] = useState(false)
  const tagline = "The Cognitive Layer of Meetings"

  useEffect(() => {
    // Start exit animation before completing
    const exitTimer = setTimeout(() => {
      setIsExiting(true)
    }, duration - 500)

    // Complete and unmount
    const completeTimer = setTimeout(() => {
      onComplete()
    }, duration)

    return () => {
      clearTimeout(exitTimer)
      clearTimeout(completeTimer)
    }
  }, [duration, onComplete])

  return (
    <div className={`splash-container ${isExiting ? 'splash-exit' : ''}`}>
      <div className="logo-wrapper">
        {/* Animated Logo */}
        <NeuroNotesLogo className="logo-icon" />
        
        {/* Brand Name */}
        <h1 className="brand-name">NeuroNotes</h1>
        
        {/* Tagline with typing effect */}
        <div className="tagline-container">
          <span className="tagline">{tagline}</span>
        </div>
      </div>
    </div>
  )
}
