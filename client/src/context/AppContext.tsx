import React, { createContext, useContext, useReducer, useCallback, useEffect, ReactNode } from 'react'
import { AppState, AppActions, TranscriptEntry, Meeting } from '../types'
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
  isNewMeetingModalOpen: false,
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
  | { type: 'SET_MEETINGS'; payload: Meeting[] }
  | { type: 'SET_TRANSCRIPT'; payload: TranscriptEntry[] }
  | { type: 'DELETE_MEETING'; payload: string }
  | { type: 'TOGGLE_NEW_MEETING_MODAL'; payload: boolean }

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
    case 'SET_MEETINGS':
      return { ...state, meetings: action.payload }
    case 'SET_TRANSCRIPT': {
      const meetings = state.meetings.map(m => {
        if (m.id === state.activeMeetingId) {
          return { ...m, transcript: action.payload }
        }
        return m
      })
      return { ...state, meetings }
    }
    case 'DELETE_MEETING':
      return {
        ...state,
        meetings: state.meetings.filter(m => m.id !== action.payload),
        activeMeetingId: state.activeMeetingId === action.payload ? null : state.activeMeetingId
      }
    case 'TOGGLE_NEW_MEETING_MODAL':
      return { ...state, isNewMeetingModalOpen: action.payload }
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
    setMeetings: useCallback((meetings: Meeting[]) => {
      dispatch({ type: 'SET_MEETINGS', payload: meetings })
    }, []),
    deleteMeeting: useCallback(async (meetingId: string) => {
      try {
        await fetch(`http://localhost:5000/api/meetings/${meetingId}`, { method: 'DELETE' });
        // Ideally fetch updated list or filter local state
        // For now, reload page or filter? Accessing current state in callback is hard without ref or functional update if `meetings` dependency isn't added.
        // Since `meetings` is in state, but dispatch can handle it?
        // I need a DELETE_MEETING action.
        // Let's add that.
        dispatch({ type: 'DELETE_MEETING', payload: meetingId });
      } catch (err) {
        console.error('Failed to delete meeting:', err);
      }
    }, []),
    toggleNewMeetingModal: useCallback((isOpen: boolean) => {
      dispatch({ type: 'TOGGLE_NEW_MEETING_MODAL', payload: isOpen })
    }, []),
  }

  // Fetch initial meetings list
  useEffect(() => {
    fetch('http://localhost:5000/api/meetings')
      .then(res => res.json())
      .then(data => {
        // Transform backend meetings to match frontend Meeting type if needed
        const realMeetings = data.map((m: any) => ({
          id: m.id,
          title: m.title,
          status: m.status,
          startTime: new Date(m.startTime),
          endTime: m.endTime ? new Date(m.endTime) : undefined,
          participants: m.participants || [], // Default to empty if missing
          transcript: [],
          summary: m.summary || {},
        }))
        // Combine with mock data for now, but prioritize real meetings
        const allMeetings = [...realMeetings, ...mockMeetings]
        dispatch({ type: 'SET_MEETINGS', payload: allMeetings })

        // Auto-select first real meeting if available
        if (realMeetings.length > 0) {
          dispatch({ type: 'SET_ACTIVE_MEETING', payload: realMeetings[0].id })
        }
      })
      .catch(err => console.error('Failed to fetch meetings:', err))
  }, [])

  // Fetch transcript for active meeting
  useEffect(() => {
    if (!state.activeMeetingId) return

    const fetchTranscript = () => {
      fetch(`http://localhost:5000/api/meetings/${state.activeMeetingId}/transcript`)
        .then(res => res.json())
        .then(data => {
          const formattedTranscript = data.map((t: any) => ({
            ...t,
            timestamp: new Date(t.timestamp),
            speaker: { ...t.speaker, id: t.speaker.name } // Temporary mapping
          }))
          dispatch({ type: 'SET_TRANSCRIPT', payload: formattedTranscript })
        })
        .catch(err => console.error('Failed to fetch transcript:', err))
    }

    fetchTranscript()
    // Poll every 3 seconds for new transcript chunks
    const interval = setInterval(fetchTranscript, 3000)
    return () => clearInterval(interval)
  }, [state.activeMeetingId])

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
