import { useState } from "react"
import { Link } from "react-router-dom"
import { ArrowLeft, User, Bell, Shield, Palette, Globe, Save } from "lucide-react"

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    notifications: {
      email: true,
      push: false,
      marketing: false,
    },
    privacy: {
      profileVisibility: 'public',
      showEmail: false,
      showWallet: true,
    },
    appearance: {
      theme: 'dark',
      language: 'en',
    },
    network: {
      defaultNetwork: 'paseo',
      autoConnect: true,
    }
  })

  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    // Simulate saving
    setTimeout(() => {
      setIsSaving(false)
      // Show success message
    }, 1000)
  }

  const updateSetting = (category: string, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category as keyof typeof prev],
        [key]: value
      }
    }))
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <Link to="/" className="inline-flex items-center text-muted hover:text-foreground mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-muted">Manage your account preferences and privacy settings</p>
        </div>

        <div className="space-y-8">
          {/* Profile Settings */}
          <div className="bg-card rounded-lg border border-border/30 p-6">
            <div className="flex items-center mb-4">
              <User className="w-5 h-5 text-accent mr-2" />
              <h2 className="text-xl font-semibold text-foreground">Profile</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Profile Visibility
                </label>
                <select
                  value={settings.privacy.profileVisibility}
                  onChange={(e) => updateSetting('privacy', 'profileVisibility', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border/50 focus:border-accent focus:outline-none text-foreground"
                >
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                  <option value="friends">Friends Only</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-foreground">Show Email</label>
                  <p className="text-xs text-muted">Make your email visible to other users</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.privacy.showEmail}
                  onChange={(e) => updateSetting('privacy', 'showEmail', e.target.checked)}
                  className="rounded border-border/50"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-foreground">Show Wallet Address</label>
                  <p className="text-xs text-muted">Make your wallet address visible to other users</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.privacy.showWallet}
                  onChange={(e) => updateSetting('privacy', 'showWallet', e.target.checked)}
                  className="rounded border-border/50"
                />
              </div>
            </div>
          </div>

          {/* Notification Settings */}
          <div className="bg-card rounded-lg border border-border/30 p-6">
            <div className="flex items-center mb-4">
              <Bell className="w-5 h-5 text-accent mr-2" />
              <h2 className="text-xl font-semibold text-foreground">Notifications</h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-foreground">Email Notifications</label>
                  <p className="text-xs text-muted">Receive email updates about your account</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.notifications.email}
                  onChange={(e) => updateSetting('notifications', 'email', e.target.checked)}
                  className="rounded border-border/50"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-foreground">Push Notifications</label>
                  <p className="text-xs text-muted">Receive push notifications in your browser</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.notifications.push}
                  onChange={(e) => updateSetting('notifications', 'push', e.target.checked)}
                  className="rounded border-border/50"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-foreground">Marketing Emails</label>
                  <p className="text-xs text-muted">Receive updates about new features and promotions</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.notifications.marketing}
                  onChange={(e) => updateSetting('notifications', 'marketing', e.target.checked)}
                  className="rounded border-border/50"
                />
              </div>
            </div>
          </div>

          {/* Appearance Settings */}
          <div className="bg-card rounded-lg border border-border/30 p-6">
            <div className="flex items-center mb-4">
              <Palette className="w-5 h-5 text-accent mr-2" />
              <h2 className="text-xl font-semibold text-foreground">Appearance</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Theme
                </label>
                <select
                  value={settings.appearance.theme}
                  onChange={(e) => updateSetting('appearance', 'theme', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border/50 focus:border-accent focus:outline-none text-foreground"
                >
                  <option value="dark">Dark</option>
                  <option value="light">Light</option>
                  <option value="system">System</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Language
                </label>
                <select
                  value={settings.appearance.language}
                  onChange={(e) => updateSetting('appearance', 'language', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border/50 focus:border-accent focus:outline-none text-foreground"
                >
                  <option value="en">English</option>
                  <option value="es">Español</option>
                  <option value="fr">Français</option>
                  <option value="de">Deutsch</option>
                </select>
              </div>
            </div>
          </div>

          {/* Network Settings */}
          <div className="bg-card rounded-lg border border-border/30 p-6">
            <div className="flex items-center mb-4">
              <Globe className="w-5 h-5 text-accent mr-2" />
              <h2 className="text-xl font-semibold text-foreground">Network</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Default Network
                </label>
                <select
                  value={settings.network.defaultNetwork}
                  onChange={(e) => updateSetting('network', 'defaultNetwork', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border/50 focus:border-accent focus:outline-none text-foreground"
                >
                  <option value="paseo">Paseo</option>
                  <option value="polkadot">Polkadot</option>
                  <option value="kusama">Kusama</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-foreground">Auto-connect Wallet</label>
                  <p className="text-xs text-muted">Automatically connect to your wallet when you visit</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.network.autoConnect}
                  onChange={(e) => updateSetting('network', 'autoConnect', e.target.checked)}
                  className="rounded border-border/50"
                />
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="btn-primary px-6 py-3 rounded-lg font-medium flex items-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
