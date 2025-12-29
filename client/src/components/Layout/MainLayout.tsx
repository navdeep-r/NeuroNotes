import { useNavigate } from 'react-router-dom'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import CommandBar from './CommandBar'
import NewMeetingModal from '../Modals/NewMeetingModal'
import { useAppState, useAppActions } from '../../context/AppContext'
import { Meeting } from '../../types'

/**
 * MainLayout - Primary layout component using CSS Grid
 * Creates four distinct regions: sidebar, topbar, content, and command bar
 * Implements the global SaaS layout structure per Requirements 1.1-1.5
 */
export default function MainLayout() {
  const { sidebarCollapsed, isNewMeetingModalOpen, meetings } = useAppState()
  const { toggleNewMeetingModal, setMeetings, setActiveMeeting } = useAppActions()

  const navigate = useNavigate()

  const handleCreateMeeting = async (title: string, participants: string[]) => {
    try {
      const res = await fetch('http://localhost:5000/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, participants })
      })
      const newMeeting = await res.json()

      // Transform backend meeting to frontend Meeting type
      const frontendMeeting: Meeting = {
        id: newMeeting.id,
        title: newMeeting.title,
        status: newMeeting.status,
        startTime: new Date(newMeeting.startTime),
        endTime: newMeeting.endTime ? new Date(newMeeting.endTime) : undefined,
        participants: newMeeting.participants || [],
        transcript: [],
        summary: {
          keyPoints: [],
          decisions: [],
          actionItems: []
        },
      }

      // Update global state
      setMeetings([frontendMeeting, ...meetings])
      setActiveMeeting(frontendMeeting.id)

      // Close modal and navigate
      toggleNewMeetingModal(false)
      navigate('/live')

    } catch (err) {
      console.error('Failed to create meeting:', err)
    }
  }

  return (
    <div
      className="h-screen grid"
      style={{
        gridTemplateColumns: sidebarCollapsed ? '64px 1fr' : '280px 1fr',
        gridTemplateRows: '64px 1fr 72px',
        gridTemplateAreas: `
          "sidebar topbar"
          "sidebar content"
          "sidebar commandbar"
        `,
      }}
    >
      <NewMeetingModal
        isOpen={isNewMeetingModalOpen}
        onClose={() => toggleNewMeetingModal(false)}
        onCreate={handleCreateMeeting}
      />

      {/* Left Sidebar - Navigation + Meeting List */}
      <aside
        className="glass-panel overflow-hidden"
        style={{ gridArea: 'sidebar' }}
      >
        <Sidebar />
      </aside>

      {/* Top Bar - Live Context Header */}
      <header
        className="glass border-b border-white/5 sticky top-0 z-10"
        style={{ gridArea: 'topbar' }}
      >
        <TopBar />
      </header>

      {/* Main Content Area */}
      <main
        className="overflow-auto bg-dark-900"
        style={{ gridArea: 'content' }}
      >
        <Outlet />
      </main>

      {/* Bottom Command Bar */}
      <footer
        className="glass border-t border-white/5"
        style={{ gridArea: 'commandbar' }}
      >
        <CommandBar />
      </footer>
    </div>
  )
}
