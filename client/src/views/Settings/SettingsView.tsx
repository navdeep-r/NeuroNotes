import { User, Bell, Palette, Shield, HelpCircle, Users } from 'lucide-react'
import WorkspaceSettings from './WorkspaceSettings'

interface SettingsSectionProps {
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  children: React.ReactNode
}

function SettingsSection({ title, description, icon: Icon, children }: SettingsSectionProps) {
  return (
    <div className="glass-card p-6">
      <div className="flex items-start gap-4">
        <div className="p-2 rounded-lg bg-accent-primary/10">
          <Icon className="w-5 h-5 text-accent-primary" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-white">{title}</h3>
          <p className="text-sm text-gray-400 mt-1">{description}</p>
          <div className="mt-4">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

interface ToggleProps {
  label: string
  enabled: boolean
  onChange: () => void
}

function Toggle({ label, enabled, onChange }: ToggleProps) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-gray-300 text-sm">{label}</span>
      <button
        onClick={onChange}
        className={`w-11 h-6 rounded-full transition-smooth ${enabled ? 'bg-accent-primary' : 'bg-dark-500'
          }`}
      >
        <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0.5'
          }`} />
      </button>
    </div>
  )
}

/**
 * SettingsView - User preferences and configuration
 * Implements Requirement 2.1 for settings navigation
 */
export default function SettingsView() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-gray-400 mt-1">Manage your preferences and account</p>
      </div>

      {/* Settings Sections */}
      <div className="space-y-4">
        <SettingsSection
          title="Profile"
          description="Manage your account information"
          icon={User}
        >
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wide">Name</label>
              <input
                type="text"
                defaultValue="Anna Chen"
                className="w-full mt-1 bg-dark-700/50 border border-white/10 rounded-lg px-3 py-2
                           text-white focus:outline-none focus:border-accent-primary/50 transition-smooth"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wide">Email</label>
              <input
                type="email"
                defaultValue="anna@company.com"
                className="w-full mt-1 bg-dark-700/50 border border-white/10 rounded-lg px-3 py-2
                           text-white focus:outline-none focus:border-accent-primary/50 transition-smooth"
              />
            </div>
          </div>
        </SettingsSection>

        <SettingsSection
          title="Notifications"
          description="Configure how you receive updates"
          icon={Bell}
        >
          <div className="space-y-1">
            <Toggle label="Meeting reminders" enabled={true} onChange={() => { }} />
            <Toggle label="Action item alerts" enabled={true} onChange={() => { }} />
            <Toggle label="Weekly summary emails" enabled={false} onChange={() => { }} />
            <Toggle label="Real-time transcript updates" enabled={true} onChange={() => { }} />
          </div>
        </SettingsSection>

        <SettingsSection
          title="Appearance"
          description="Customize the look and feel"
          icon={Palette}
        >
          <div className="space-y-1">
            <Toggle label="Dark mode" enabled={true} onChange={() => { }} />
            <Toggle label="Compact view" enabled={false} onChange={() => { }} />
            <Toggle label="Show timestamps" enabled={true} onChange={() => { }} />
          </div>
        </SettingsSection>

        <SettingsSection
          title="Privacy & Security"
          description="Manage your data and security settings"
          icon={Shield}
        >
          <div className="space-y-1">
            <Toggle label="Two-factor authentication" enabled={false} onChange={() => { }} />
            <Toggle label="Share analytics with team" enabled={true} onChange={() => { }} />
          </div>
        </SettingsSection>

        <SettingsSection
          title="Workspaces & Teams"
          description="Manage recipient groups for meeting summaries"
          icon={Users}
        >
          <WorkspaceSettings />
        </SettingsSection>

        <SettingsSection
          title="Help & Support"
          description="Get help and learn more about NeuroNotes"
          icon={HelpCircle}
        >
          <div className="space-y-2">
            <button className="text-accent-primary text-sm hover:underline">
              View documentation
            </button>
            <br />
            <button className="text-accent-primary text-sm hover:underline">
              Contact support
            </button>
            <br />
            <button className="text-accent-primary text-sm hover:underline">
              Report a bug
            </button>
          </div>
        </SettingsSection>
      </div>
    </div>
  )
}
