import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { ThemeProvider } from '@/components/theme-provider-simple'
import { NetworkProvider } from '@/contexts/network-context'
import { UserProvider } from '@/contexts/user-context'
import { WalletProvider } from '@/contexts/wallet-context'
import { VerificationProvider } from '@/contexts/verification-context'
import { BalanceProvider } from '@/contexts/balance-context'
import { Toaster } from '@/components/ui/sonner'

// Import pages
import HomePage from './pages/home-new'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import SearchPage from './pages/SearchPage'
import ProfilePage from './pages/ProfilePage'
import SettingsPage from './pages/SettingsPage'
import { PolkadotApiProvider } from './contexts/PolkadotApiContext'

export default function App() {
  return (
    <div className="bg-gray-900 text-white antialiased">
      <ThemeProvider>
        <NetworkProvider>
          <WalletProvider>
            <BalanceProvider>
              <VerificationProvider>
                <UserProvider>
                  <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={
                      <PolkadotApiProvider>
                        <RegisterPage />
                      </PolkadotApiProvider>
                    } />
                    <Route path="/search" element={<SearchPage />} />
                    <Route path="/profile/:id?" element={<ProfilePage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="*" element={<div>Page not found</div>} />
                  </Routes>
                  <Toaster />
                </UserProvider>
              </VerificationProvider>
            </BalanceProvider>
          </WalletProvider>
        </NetworkProvider>
      </ThemeProvider>
    </div>
  )
}
