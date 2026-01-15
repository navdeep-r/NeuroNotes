import { useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import MainLayout from './components/Layout/MainLayout'
import SplashScreen from './components/SplashScreen/SplashScreen'
import DashboardView from './views/Dashboard/DashboardView'
import LiveMeetingView from './views/LiveMeeting/LiveMeetingView'
import MeetingsHistoryView from './views/MeetingsHistory/MeetingsHistoryView'
import VisualIntelligenceView from './views/VisualIntelligence/VisualIntelligenceView'
import InsightsView from './views/Insights/InsightsView'
import SettingsView from './views/Settings/SettingsView'
import ActionsView from './views/Actions/ActionsView'

function App() {
  const [showSplash, setShowSplash] = useState(true)

  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />
  }

  return (
    <AppProvider>
      <div className="app-enter">
        <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardView />} />
            <Route path="live" element={<LiveMeetingView />} />
            <Route path="history" element={<MeetingsHistoryView />} />
            <Route path="visuals" element={<VisualIntelligenceView />} />
            <Route path="insights" element={<InsightsView />} />
            <Route path="actions" element={<ActionsView />} />
            <Route path="settings" element={<SettingsView />} />
            {/* Catch-all redirect to dashboard */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </div>
    </AppProvider>
  )
}

export default App

