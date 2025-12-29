import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import CommandBar from './CommandBar'
import { useAppState } from '../../context/AppContext'

/**
 * MainLayout - Primary layout component using CSS Grid
 * Creates four distinct regions: sidebar, topbar, content, and command bar
 * Implements the global SaaS layout structure per Requirements 1.1-1.5
 */
export default function MainLayout() {
  const { sidebarCollapsed } = useAppState()

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
