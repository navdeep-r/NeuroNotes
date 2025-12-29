import { Meeting, Speaker, TranscriptEntry, DashboardStats, RecentAction, Visualization, TimeMetrics, TrendData, Recommendation } from '../types'

// Mock speakers
export const mockSpeakers: Speaker[] = [
  { id: 'speaker-1', name: 'Anna Chen', initials: 'AC', color: '#6366f1' },
  { id: 'speaker-2', name: 'Marcus Johnson', initials: 'MJ', color: '#8b5cf6' },
  { id: 'speaker-3', name: 'Sarah Williams', initials: 'SW', color: '#10b981' },
  { id: 'speaker-4', name: 'David Kim', initials: 'DK', color: '#f59e0b' },
]

// Helper to create transcript entries
const createEntry = (
  id: string,
  speaker: Speaker,
  content: string,
  minutesAgo: number
): TranscriptEntry => ({
  id,
  speakerId: speaker.id,
  speaker,
  timestamp: new Date(Date.now() - minutesAgo * 60000),
  content,
})

// Mock transcript for live meeting
export const mockTranscript: TranscriptEntry[] = [
  createEntry('t1', mockSpeakers[0], "Good morning everyone. Let's kick off our sales strategy sync. I want to discuss our Q1 targets and the new proposal.", 15),
  createEntry('t2', mockSpeakers[1], "Thanks Anna. I've been looking at the numbers and we're currently at 78% of our quarterly goal with 6 weeks remaining.", 14),
  createEntry('t3', mockSpeakers[2], "That's encouraging. What's our conversion rate looking like compared to last quarter?", 13),
  createEntry('t4', mockSpeakers[1], "We're seeing a 23% improvement in conversion rates. The new demo process is really paying off.", 12),
  createEntry('t5', mockSpeakers[0], "Excellent. Let's move forward with the new proposal for the enterprise tier. I think we can close 3 more deals this month.", 11),
  createEntry('t6', mockSpeakers[3], "I'll start working on the initial draft by tomorrow. Should have something ready for review by Wednesday.", 10),
  createEntry('t7', mockSpeakers[2], "Can we highlight the cost analysis in the report? The $2.5M savings projection is a strong selling point.", 9),
  createEntry('t8', mockSpeakers[0], "Absolutely. That's a key differentiator. Marcus, can you pull the ROI data from our last 5 enterprise clients?", 8),
  createEntry('t9', mockSpeakers[1], "On it. I'll have that compiled by end of day. We should also mention the 40% reduction in onboarding time.", 7),
  createEntry('t10', mockSpeakers[3], "I've decided we should prioritize the healthcare vertical. They have the highest average deal size at $450K.", 6),
  createEntry('t11', mockSpeakers[2], "Good call. I'll reach out to our contacts at MedTech Solutions and HealthFirst.", 5),
  createEntry('t12', mockSpeakers[0], "Perfect. Let's set a follow-up meeting for Friday to review progress. Action item: everyone prepare their pipeline updates.", 4),
]

// Mock meetings
export const mockMeetings: Meeting[] = [
  {
    id: 'meeting-1',
    title: 'Sales Strategy Sync',
    status: 'live',
    startTime: new Date(Date.now() - 15 * 60000),
    participants: mockSpeakers,
    transcript: mockTranscript,
  },
  {
    id: 'meeting-2',
    title: 'Weekly Team Standup',
    status: 'completed',
    startTime: new Date(Date.now() - 24 * 60 * 60000),
    endTime: new Date(Date.now() - 23.5 * 60 * 60000),
    duration: 1800,
    participants: [mockSpeakers[0], mockSpeakers[1]],
    transcript: [],
    summary: {
      keyPoints: ['Sprint progress on track', 'New feature deployment scheduled', 'Bug fixes prioritized'],
      decisions: [{ id: 'd1', content: 'Deploy v2.3 on Thursday', timestamp: new Date(), participants: ['Anna Chen'] }],
      actionItems: [{ id: 'a1', content: 'Update documentation', status: 'pending', createdAt: new Date() }],
    },
  },
  {
    id: 'meeting-3',
    title: 'Q1 Financial Review',
    status: 'completed',
    startTime: new Date(Date.now() - 48 * 60 * 60000),
    endTime: new Date(Date.now() - 47 * 60 * 60000),
    duration: 3600,
    participants: [mockSpeakers[0], mockSpeakers[2], mockSpeakers[3]],
    transcript: [],
    summary: {
      keyPoints: ['Revenue up 15%', 'Operating costs reduced', 'New budget approved'],
      decisions: [{ id: 'd2', content: 'Increase marketing budget by 20%', timestamp: new Date(), participants: ['Sarah Williams'] }],
      actionItems: [{ id: 'a2', content: 'Prepare investor presentation', status: 'in_progress', createdAt: new Date() }],
    },
  },
  {
    id: 'meeting-4',
    title: 'Product Brainstorming',
    status: 'completed',
    startTime: new Date(Date.now() - 72 * 60 * 60000),
    endTime: new Date(Date.now() - 71 * 60 * 60000),
    duration: 3600,
    participants: mockSpeakers,
    transcript: [],
    summary: {
      keyPoints: ['AI features roadmap defined', 'User feedback incorporated', 'MVP scope finalized'],
      decisions: [{ id: 'd3', content: 'Launch beta in Q2', timestamp: new Date(), participants: ['David Kim'] }],
      actionItems: [{ id: 'a3', content: 'Create wireframes', status: 'completed', createdAt: new Date() }],
    },
  },
]

// Dashboard mock data
export const mockDashboardStats: DashboardStats = {
  totalMeetings: 47,
  meetingsThisWeek: 12,
  productivityScore: 87,
  engagementRate: 92,
  totalActionItems: 34,
  completedActions: 28,
}

export const mockRecentActions: RecentAction[] = [
  { id: 'ra1', content: 'Prepare Q1 sales report', meetingTitle: 'Sales Strategy Sync', assignee: mockSpeakers[1], status: 'in_progress', createdAt: new Date() },
  { id: 'ra2', content: 'Schedule client demo', meetingTitle: 'Weekly Team Standup', assignee: mockSpeakers[2], status: 'pending', createdAt: new Date() },
  { id: 'ra3', content: 'Review budget proposal', meetingTitle: 'Q1 Financial Review', assignee: mockSpeakers[0], status: 'completed', createdAt: new Date() },
  { id: 'ra4', content: 'Update product roadmap', meetingTitle: 'Product Brainstorming', assignee: mockSpeakers[3], status: 'pending', createdAt: new Date() },
]

// Visualization mock data
export const mockVisualizations: Visualization[] = [
  { id: 'v1', title: 'Meeting Duration Trends', description: 'Average meeting length over the past month', type: 'line', data: { labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'], values: [45, 38, 42, 35] } },
  { id: 'v2', title: 'Action Items by Status', description: 'Distribution of action items across statuses', type: 'bar', data: { labels: ['Pending', 'In Progress', 'Completed'], values: [12, 8, 28] } },
  { id: 'v3', title: 'Speaker Participation', description: 'Talk time distribution among participants', type: 'pie', data: { labels: ['Anna', 'Marcus', 'Sarah', 'David'], values: [35, 25, 22, 18] } },
  { id: 'v4', title: 'Meeting Timeline', description: 'Key decisions and milestones this quarter', type: 'timeline', data: { labels: ['Jan', 'Feb', 'Mar'], values: [5, 8, 12] } },
]

// Insights mock data
export const mockTimeMetrics: TimeMetrics = {
  totalMeetingTime: 2340,
  averageMeetingLength: 42,
  timeInDecisions: 480,
  timeInDiscussion: 1860,
}

export const mockTrendData: TrendData[] = [
  { date: '2024-01-01', value: 75 },
  { date: '2024-01-08', value: 78 },
  { date: '2024-01-15', value: 82 },
  { date: '2024-01-22', value: 85 },
  { date: '2024-01-29', value: 87 },
]

export const mockRecommendations: Recommendation[] = [
  { id: 'r1', title: 'Reduce meeting frequency', description: 'Consider consolidating weekly syncs to bi-weekly to save 2 hours per week', impact: 'high' },
  { id: 'r2', title: 'Set time limits', description: 'Meetings averaging 45+ minutes could benefit from stricter agendas', impact: 'medium' },
  { id: 'r3', title: 'Increase async updates', description: 'Status updates could be shared via async channels', impact: 'low' },
]
