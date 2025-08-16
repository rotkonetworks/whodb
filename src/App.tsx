import { Routes, Route } from 'react-router-dom'
import { ThemeProvider } from '@/components/theme-provider-simple'
import { NetworkProvider } from '@/contexts/network-context'
import { UserProvider } from '@/contexts/user-context'
import { VerificationProvider } from '@/contexts/verification-context'
import { BalanceProvider } from '@/contexts/balance-context'
import { Toaster } from '@/components/ui/sonner'
import { useModalAwareToasts } from '@/hooks/useModalAwareToasts'
import OptimizedPolkadotRoute from '@/components/OptimizedPolkadotRoute'

// Import pages
import HomePage from './pages/homepage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import SearchPage from './pages/SearchPage'
import ProfilePage from './pages/ProfilePage'
import SettingsPage from './pages/SettingsPage'
import { PolkadotWalletProvider } from './contexts/PolkadotWalletContext'
import { AccountProvider } from './contexts/wallet-context'
import { SearchProvider, WebSocketProvider } from './contexts/web-socket-provider'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient()

export default function App() {
  // Enable modal-aware toast behavior
  useModalAwareToasts();
  return (
    <div className="bg-gray-900 text-white antialiased">
      <ThemeProvider>
        <NetworkProvider>
          <PolkadotWalletProvider appName="Whodb Registrar">
            <AccountProvider>
              <BalanceProvider>
                <UserProvider>
                  <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={
                      <OptimizedPolkadotRoute>
                        <RegisterPage />
                      </OptimizedPolkadotRoute>
                    } />
                    <Route path="/search" element={<SearchPage />} />
                    <Route path="/profile/:id" element={<ProfilePage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="*" element={<div>Page not found</div>} />
                  </Routes>
                  <Toaster />
                </UserProvider>
              </BalanceProvider>
            </AccountProvider>
          </PolkadotWalletProvider>
        </NetworkProvider>
      </ThemeProvider>
    </div>
  )
}
