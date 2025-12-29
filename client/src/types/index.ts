// Core entity types for MinuteFlow

export interface Speaker {
  id: string
  name: string
  avatar?: string
  initials: string
  color: string
}

export interface Highlight {
  type: 'metric' | 'decision' | 'action'
  startIndex: number
  endIndex: number
  text: string
}

export interface TranscriptEntry {
  id: string
  speakerId: string
  speaker: Speaker
  timestamp: Date
  content: string
  highlights?: Highlight[]
}

export interface Decision {
  id: string
  content: string
  timestamp: Date
  participants: string[]
}

export interface ActionItem {
  id: string
  content: string
  assignee?: Speaker
  dueDate?: Date
  status: 'pending' | 'in_progress' | 'completed'
  createdAt: Date
}

export interface MeetingSummary {
  keyPoints: string[]
  decisions: Decision[]
  actionItems: ActionItem[]
}

export interface Meeting {
  id: string
  title: string
  status: 'live' | 'completed' | 'scheduled'
  startTime: Date
  endTime?: Date
  duration?: number
  participants: Speaker[]
  transcript: TranscriptEntry[]
  summary?: MeetingSummary
}

// Dashboard types
export interface DashboardStats {
  totalMeetings: number
  meetingsThisWeek: number
  productivityScore: number
  engagementRate: number
  totalActionItems: number
  completedActions: number
}

export interface RecentAction {
  id: string
  content: string
  meetingTitle: string
  assignee?: Speaker
  status: 'pending' | 'in_progress' | 'completed'
  createdAt: Date
}

// Visualization types
export interface ChartData {
  labels: string[]
  values: number[]
}

export interface Visualization {
  id: string
  title: string
  description: string
  type: 'line' | 'bar' | 'timeline' | 'pie'
  data: ChartData
}

// Insights types
export interface TimeMetrics {
  totalMeetingTime: number
  averageMeetingLength: number
  timeInDecisions: number
  timeInDiscussion: number
}

export interface TrendData {
  date: string
  value: number
}

export interface Recommendation {
  id: string
  title: string
  description: string
  impact: 'high' | 'medium' | 'low'
}

// Navigation types
export interface NavItem {
  id: string
  label: string
  route: string
  icon: string
}

// App state types
export interface AppState {
  activeRoute: string
  meetings: Meeting[]
  activeMeetingId: string | null
  isLive: boolean
  elapsedTime: number
  activeSpeakerId: string | null
  autoScrollEnabled: boolean
  commandInput: string
  commandBarFocused: boolean
  sidebarCollapsed: boolean
  isNewMeetingModalOpen: boolean
}

export interface AppActions {
  setActiveRoute: (route: string) => void
  setActiveMeeting: (meetingId: string | null) => void
  addTranscriptEntry: (entry: TranscriptEntry) => void
  setActiveSpeaker: (speakerId: string | null) => void
  setAutoScroll: (enabled: boolean) => void
  setCommandInput: (value: string) => void
  executeCommand: (command: string) => void
  updateElapsedTime: (time: number) => void
  toggleSidebar: () => void
  setMeetings: (meetings: Meeting[]) => void
  deleteMeeting: (meetingId: string) => void
  toggleNewMeetingModal: (isOpen: boolean) => void
}
