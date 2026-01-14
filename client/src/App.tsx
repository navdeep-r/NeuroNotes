import { Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import MainLayout from './components/Layout/MainLayout'
import DashboardView from './views/Dashboard/DashboardView'
import LiveMeetingView from './views/LiveMeeting/LiveMeetingView'
import MeetingsHistoryView from './views/MeetingsHistory/MeetingsHistoryView'
import VisualIntelligenceView from './views/VisualIntelligence/VisualIntelligenceView'
import InsightsView from './views/Insights/InsightsView'
import SettingsView from './views/Settings/SettingsView'
import ActionsView from './views/Actions/ActionsView'

function App() {
  return (
    <AppProvider>
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
    </AppProvider>
  )
}

export default App
