import { useState } from "react"
import { Button } from "@/lib/ui"
import { Switch } from "@/lib/ui"
import { Separator } from "@/lib/ui"
import { PageHeader } from "@/components/page-header"
import { User, Bell, Palette, Globe, Save } from "lucide-react"

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
    <div className="min-h-screen bg-gray-900 text-white">
      <PageHeader backTo="/" />

      <div className="container mx-auto py-10 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="space-y-3 mb-8">
            <p className="text-gray-400">Manage your account settings and preferences</p>
          </div>

          <Separator className="my-6 bg-gray-700" />

          <div className="space-y-8">
            {/* Profile Settings */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <div className="flex items-center mb-6">
                <User className="w-5 h-5 text-pink-400 mr-3" />
                <h2 className="text-xl font-semibold text-white">Profile</h2>
              </div>

              <div className="space-y-6">
                <div>
                  <div className="text-white mb-2 block text-sm font-medium">
                    Profile Visibility
                  </div>
                  <div className="relative">
                    <div
                      className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:border-pink-500 focus:outline-none cursor-pointer"
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e: React.KeyboardEvent) => {
                        if (e.key === 'Enter') {
                          const options = ['public', 'private', 'friends'];
                          const currentIndex = options.indexOf(settings.privacy.profileVisibility);
                          const nextIndex = (currentIndex + 1) % options.length;
                          updateSetting('privacy', 'profileVisibility', options[nextIndex]);
                        }
                      }}
                      onMouseDown={() => {
                        const options = ['public', 'private', 'friends'];
                        const currentIndex = options.indexOf(settings.privacy.profileVisibility);
                        const nextIndex = (currentIndex + 1) % options.length;
                        updateSetting('privacy', 'profileVisibility', options[nextIndex]);
                      }}
                    >
                      {settings.privacy.profileVisibility === 'public' && 'Public'}
                      {settings.privacy.profileVisibility === 'private' && 'Private'}
                      {settings.privacy.profileVisibility === 'friends' && 'Friends Only'}
                    </div>
                  </div>
                </div>

                <div
                  className="flex items-center justify-between p-4 bg-gray-900/50 rounded-lg cursor-pointer hover:bg-gray-900/70 transition-colors"
                  onClick={() => updateSetting('privacy', 'showEmail', !settings.privacy.showEmail)}
                >
                  <div>
                    <div className="text-sm font-medium text-white">Show Email</div>
                    <p className="text-xs text-gray-400">Make your email visible to other users</p>
                  </div>
                  <Switch
                    checked={settings.privacy.showEmail}
                    onCheckedChange={(checked: boolean) => updateSetting('privacy', 'showEmail', checked)}
                  />
                </div>

                <div
                  className="flex items-center justify-between p-4 bg-gray-900/50 rounded-lg cursor-pointer hover:bg-gray-900/70 transition-colors"
                  onClick={() => updateSetting('privacy', 'showWallet', !settings.privacy.showWallet)}
                >
                  <div>
                    <div className="text-sm font-medium text-white">Show Wallet Address</div>
                    <p className="text-xs text-gray-400">Make your wallet address visible to other users</p>
                  </div>
                  <Switch
                    checked={settings.privacy.showWallet}
                    onCheckedChange={(checked: boolean) => updateSetting('privacy', 'showWallet', checked)}
                  />
                </div>
              </div>
            </div>

            {/* Notification Settings */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <div className="flex items-center mb-6">
                <Bell className="w-5 h-5 text-pink-400 mr-3" />
                <h2 className="text-xl font-semibold text-white">Notifications</h2>
              </div>

              <div className="space-y-4">
                <div
                  className="flex items-center justify-between p-4 bg-gray-900/50 rounded-lg cursor-pointer hover:bg-gray-900/70 transition-colors"
                  onClick={() => updateSetting('notifications', 'email', !settings.notifications.email)}
                >
                  <div>
                    <div className="text-sm font-medium text-white">Email Notifications</div>
                    <p className="text-xs text-gray-400">Receive email updates about your account</p>
                  </div>
                  <Switch
                    checked={settings.notifications.email}
                    onCheckedChange={(checked: boolean) => updateSetting('notifications', 'email', checked)}
                  />
                </div>

                <div
                  className="flex items-center justify-between p-4 bg-gray-900/50 rounded-lg cursor-pointer hover:bg-gray-900/70 transition-colors"
                  onClick={() => updateSetting('notifications', 'push', !settings.notifications.push)}
                >
                  <div>
                    <div className="text-sm font-medium text-white">Push Notifications</div>
                    <p className="text-xs text-gray-400">Receive push notifications in your browser</p>
                  </div>
                  <Switch
                    checked={settings.notifications.push}
                    onCheckedChange={(checked: boolean) => updateSetting('notifications', 'push', checked)}
                  />
                </div>

                <div
                  className="flex items-center justify-between p-4 bg-gray-900/50 rounded-lg cursor-pointer hover:bg-gray-900/70 transition-colors"
                  onClick={() => updateSetting('notifications', 'marketing', !settings.notifications.marketing)}
                >
                  <div>
                    <div className="text-sm font-medium text-white">Marketing Emails</div>
                    <p className="text-xs text-gray-400">Receive updates about new features and promotions</p>
                  </div>
                  <Switch
                    checked={settings.notifications.marketing}
                    onCheckedChange={(checked: boolean) => updateSetting('notifications', 'marketing', checked)}
                  />
                </div>
              </div>
            </div>

            {/* Appearance Settings */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <div className="flex items-center mb-6">
                <Palette className="w-5 h-5 text-pink-400 mr-3" />
                <h2 className="text-xl font-semibold text-white">Appearance</h2>
              </div>

              <div className="space-y-6">
                <div>
                  <div className="text-white mb-2 block text-sm font-medium">
                    Theme
                  </div>
                  <div className="relative">
                    <div
                      className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:border-pink-500 focus:outline-none cursor-pointer"
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e: React.KeyboardEvent) => {
                        if (e.key === 'Enter') {
                          const options = ['dark', 'light', 'system'];
                          const currentIndex = options.indexOf(settings.appearance.theme);
                          const nextIndex = (currentIndex + 1) % options.length;
                          updateSetting('appearance', 'theme', options[nextIndex]);
                        }
                      }}
                      onMouseDown={() => {
                        const options = ['dark', 'light', 'system'];
                        const currentIndex = options.indexOf(settings.appearance.theme);
                        const nextIndex = (currentIndex + 1) % options.length;
                        updateSetting('appearance', 'theme', options[nextIndex]);
                      }}
                    >
                      {settings.appearance.theme === 'dark' && 'Dark'}
                      {settings.appearance.theme === 'light' && 'Light'}
                      {settings.appearance.theme === 'system' && 'System'}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-white mb-2 block text-sm font-medium">
                    Language
                  </div>
                  <div className="relative">
                    <div
                      className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:border-pink-500 focus:outline-none cursor-pointer"
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e: React.KeyboardEvent) => {
                        if (e.key === 'Enter') {
                          const options = ['en', 'es', 'fr', 'de'];
                          const currentIndex = options.indexOf(settings.appearance.language);
                          const nextIndex = (currentIndex + 1) % options.length;
                          updateSetting('appearance', 'language', options[nextIndex]);
                        }
                      }}
                      onMouseDown={() => {
                        const options = ['en', 'es', 'fr', 'de'];
                        const currentIndex = options.indexOf(settings.appearance.language);
                        const nextIndex = (currentIndex + 1) % options.length;
                        updateSetting('appearance', 'language', options[nextIndex]);
                      }}
                    >
                      {settings.appearance.language === 'en' && 'English'}
                      {settings.appearance.language === 'es' && 'Español'}
                      {settings.appearance.language === 'fr' && 'Français'}
                      {settings.appearance.language === 'de' && 'Deutsch'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Network Settings */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <div className="flex items-center mb-6">
                <Globe className="w-5 h-5 text-pink-400 mr-3" />
                <h2 className="text-xl font-semibold text-white">Network</h2>
              </div>

              <div className="space-y-6">
                <div>
                  <div className="text-white mb-2 block text-sm font-medium">
                    Default Network
                  </div>
                  <div className="relative">
                    <div
                      className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:border-pink-500 focus:outline-none cursor-pointer"
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e: React.KeyboardEvent) => {
                        if (e.key === 'Enter') {
                          const options = ['paseo', 'polkadot', 'kusama'];
                          const currentIndex = options.indexOf(settings.network.defaultNetwork);
                          const nextIndex = (currentIndex + 1) % options.length;
                          updateSetting('network', 'defaultNetwork', options[nextIndex]);
                        }
                      }}
                      onMouseDown={() => {
                        const options = ['paseo', 'polkadot', 'kusama'];
                        const currentIndex = options.indexOf(settings.network.defaultNetwork);
                        const nextIndex = (currentIndex + 1) % options.length;
                        updateSetting('network', 'defaultNetwork', options[nextIndex]);
                      }}
                    >
                      {settings.network.defaultNetwork === 'paseo' && 'Paseo'}
                      {settings.network.defaultNetwork === 'polkadot' && 'Polkadot'}
                      {settings.network.defaultNetwork === 'kusama' && 'Kusama'}
                    </div>
                  </div>
                </div>

                <div
                  className="flex items-center justify-between p-4 bg-gray-900/50 rounded-lg cursor-pointer hover:bg-gray-900/70 transition-colors"
                  onClick={() => updateSetting('network', 'autoConnect', !settings.network.autoConnect)}
                >
                  <div>
                    <div className="text-sm font-medium text-white">Auto-connect Wallet</div>
                    <p className="text-xs text-gray-400">Automatically connect to your wallet when you visit</p>
                  </div>
                  <Switch
                    checked={settings.network.autoConnect}
                    onCheckedChange={(checked: boolean) => updateSetting('network', 'autoConnect', checked)}
                  />
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-6">
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="px-6 py-3 bg-pink-500 hover:bg-pink-600 text-white font-medium flex items-center space-x-2"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
