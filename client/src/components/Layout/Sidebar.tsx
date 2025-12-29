import { useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Radio,
  History,
  BarChart3,
  LineChart,
  Settings,
  ChevronLeft,
  ChevronRight,
  PlusCircle
} from 'lucide-react'
import { useAppState, useAppActions } from '../../context/AppContext'
import MeetingList from '../MeetingList/MeetingList'

interface NavItemData {
  id: string
  label: string
  route: string
  icon: React.ComponentType<{ className?: string }>
}

const navItems: NavItemData[] = [
  { id: 'dashboard', label: 'Dashboard', route: '/dashboard', icon: LayoutDashboard },
  { id: 'live', label: 'Live Meeting', route: '/live', icon: Radio },
  { id: 'history', label: 'Meetings History', route: '/history', icon: History },
  { id: 'visuals', label: 'Visual Intelligence', route: '/visuals', icon: BarChart3 },
  { id: 'insights', label: 'Insights / Analytics', route: '/insights', icon: LineChart },
  { id: 'settings', label: 'Settings', route: '/settings', icon: Settings },
]

/**
 * Sidebar - Navigation and meeting list component
 * Implements Requests:
 * - Start Analysis opens global modal
 * - Meeting List supports delete
 */
export default function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { sidebarCollapsed, meetings, activeMeetingId } = useAppState()
  const { setActiveMeeting, toggleSidebar, setActiveRoute, toggleNewMeetingModal } = useAppActions()

  const handleNavClick = (route: string) => {
    setActiveRoute(route)
    navigate(route)
  }

  const handleMeetingSelect = (meetingId: string) => {
    setActiveMeeting(meetingId)
    // Navigate to live view when selecting a meeting
    navigate('/live')
  }

  return (
    <div className="h-full flex flex-col relative">
      {/* Logo / Brand */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-white/5">
        {!sidebarCollapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center">
              <Radio className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-lg">MinuteFlow</span>
          </div>
        )}
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-lg hover:bg-white/5 transition-smooth"
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Navigation Items */}
      <nav className="p-2 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.route

          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.route)}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-smooth
                ${isActive
                  ? 'bg-accent-primary/20 text-accent-primary'
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }
              `}
              data-testid={`nav-${item.id}`}
              data-active={isActive}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!sidebarCollapsed && (
                <span className="text-sm font-medium">{item.label}</span>
              )}
              {item.id === 'live' && !sidebarCollapsed && (
                <span className="ml-auto w-2 h-2 rounded-full bg-red-500 animate-pulse-live" />
              )}
            </button>
          )
        })}
      </nav>

      {/* Divider */}
      <div className="mx-4 my-2 border-t border-white/5" />

      {/* "Start Analysis" Button */}
      {!sidebarCollapsed && (
        <div className="px-4 py-2">
          <button
            onClick={() => toggleNewMeetingModal(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-accent-primary to-accent-secondary hover:brightness-110 text-white text-sm font-bold rounded-lg shadow-lg shadow-accent-primary/20 transition-all mb-2"
          >
            <PlusCircle className="w-4 h-4" />
            Start Analysis
          </button>
        </div>
      )}

      {/* Sidebar Collapsed "Add" Icon */}
      {sidebarCollapsed && (
        <div className="px-2 py-2 flex justify-center">
          <button
            onClick={() => toggleNewMeetingModal(true)}
            className="p-2 bg-accent-primary/20 text-accent-primary hover:bg-accent-primary hover:text-white rounded-lg transition-all"
            title="Start New Analysis"
          >
            <PlusCircle className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Meeting List */}
      {!sidebarCollapsed && (
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="px-4 py-2">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Meetings
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto px-2">
            <MeetingList
              meetings={meetings}
              activeMeetingId={activeMeetingId}
              onSelect={handleMeetingSelect}
            />
          </div>
        </div>
      )}
    </div>
  )
}
