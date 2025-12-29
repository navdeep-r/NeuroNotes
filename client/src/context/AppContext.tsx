import React, { createContext, useContext, useReducer, useCallback, useEffect, ReactNode } from 'react'
import { AppState, AppActions, TranscriptEntry } from '../types'
import { mockMeetings, mockSpeakers } from '../data/mockData'

// Initial state
const initialState: AppState = {
  activeRoute: '/dashboard',
  meetings: mockMeetings,
  activeMeetingId: 'meeting-1', // Start with live meeting selected
  isLive: true,
  elapsedTime: 0,
  activeSpeakerId: mockSpeakers[0].id,
  autoScrollEnabled: true,
  commandInput: '',
  commandBarFocused: false,
  sidebarCollapsed: false,
}

// Action types
type Action =
  | { type: 'SET_ACTIVE_ROUTE'; payload: string }
  | { type: 'SET_ACTIVE_MEETING'; payload: string | null }
  | { type: 'ADD_TRANSCRIPT_ENTRY'; payload: TranscriptEntry }
  | { type: 'SET_ACTIVE_SPEAKER'; payload: string | null }
  | { type: 'SET_AUTO_SCROLL'; payload: boolean }
  | { type: 'SET_COMMAND_INPUT'; payload: string }
  | { type: 'SET_COMMAND_BAR_FOCUSED'; payload: boolean }
  | { type: 'UPDATE_ELAPSED_TIME'; payload: number }
  | { type: 'TOGGLE_SIDEBAR' }

// Reducer
function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_ACTIVE_ROUTE':
      return { ...state, activeRoute: action.payload }
    case 'SET_ACTIVE_MEETING': {
      const meeting = state.meetings.find(m => m.id === action.payload)
      return {
        ...state,
        activeMeetingId: action.payload,
        isLive: meeting?.status === 'live',
        elapsedTime: meeting?.status === 'live' ? state.elapsedTime : 0,
      }
    }
    case 'ADD_TRANSCRIPT_ENTRY': {
      const meetings = state.meetings.map(m => {
        if (m.id === state.activeMeetingId) {
          return { ...m, transcript: [...m.transcript, action.payload] }
        }
        return m
      })
      return { ...state, meetings }
    }
    case 'SET_ACTIVE_SPEAKER':
      return { ...state, activeSpeakerId: action.payload }
    case 'SET_AUTO_SCROLL':
      return { ...state, autoScrollEnabled: action.payload }
    case 'SET_COMMAND_INPUT':
      return { ...state, commandInput: action.payload }
    case 'SET_COMMAND_BAR_FOCUSED':
      return { ...state, commandBarFocused: action.payload }
    case 'UPDATE_ELAPSED_TIME':
      return { ...state, elapsedTime: action.payload }
    case 'TOGGLE_SIDEBAR':
      return { ...state, sidebarCollapsed: !state.sidebarCollapsed }
    default:
      return state
  }
}

// Context
const AppStateContext = createContext<AppState | undefined>(undefined)
const AppActionsContext = createContext<AppActions | undefined>(undefined)

// Provider component
export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState)

  // Actions
  const actions: AppActions = {
    setActiveRoute: useCallback((route: string) => {
      dispatch({ type: 'SET_ACTIVE_ROUTE', payload: route })
    }, []),
    setActiveMeeting: useCallback((meetingId: string | null) => {
      dispatch({ type: 'SET_ACTIVE_MEETING', payload: meetingId })
    }, []),
    addTranscriptEntry: useCallback((entry: TranscriptEntry) => {
      dispatch({ type: 'ADD_TRANSCRIPT_ENTRY', payload: entry })
    }, []),
    setActiveSpeaker: useCallback((speakerId: string | null) => {
      dispatch({ type: 'SET_ACTIVE_SPEAKER', payload: speakerId })
    }, []),
    setAutoScroll: useCallback((enabled: boolean) => {
      dispatch({ type: 'SET_AUTO_SCROLL', payload: enabled })
    }, []),
    setCommandInput: useCallback((value: string) => {
      dispatch({ type: 'SET_COMMAND_INPUT', payload: value })
    }, []),
    executeCommand: useCallback((command: string) => {
      // Process command - for now just clear input
      console.log('Executing command:', command)
      dispatch({ type: 'SET_COMMAND_INPUT', payload: '' })
    }, []),
    updateElapsedTime: useCallback((time: number) => {
      dispatch({ type: 'UPDATE_ELAPSED_TIME', payload: time })
    }, []),
    toggleSidebar: useCallback(() => {
      dispatch({ type: 'TOGGLE_SIDEBAR' })
    }, []),
  }

  // Timer effect for live meetings
  useEffect(() => {
    if (!state.isLive) return

    const liveMeeting = state.meetings.find(m => m.id === state.activeMeetingId)
    if (!liveMeeting) return

    const startTime = liveMeeting.startTime.getTime()
    
    const updateTimer = () => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000)
      dispatch({ type: 'UPDATE_ELAPSED_TIME', payload: elapsed })
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [state.isLive, state.activeMeetingId, state.meetings])

  return (
    <AppStateContext.Provider value={state}>
      <AppActionsContext.Provider value={actions}>
        {children}
      </AppActionsContext.Provider>
    </AppStateContext.Provider>
  )
}

// Hooks
export function useAppState(): AppState {
  const context = useContext(AppStateContext)
  if (context === undefined) {
    throw new Error('useAppState must be used within an AppProvider')
  }
  return context
}

export function useAppActions(): AppActions {
  const context = useContext(AppActionsContext)
  if (context === undefined) {
    throw new Error('useAppActions must be used within an AppProvider')
  }
  return context
}

// Combined hook for convenience
export function useApp(): [AppState, AppActions] {
  return [useAppState(), useAppActions()]
}
