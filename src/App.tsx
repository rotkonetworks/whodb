import { Routes, Route } from 'react-router-dom'
import { ThemeProvider } from '@/components/theme-provider-simple'
import { NetworkProvider } from '@/contexts/network-context'
import { UserProvider } from '@/contexts/user-context'
import { VerificationProvider } from '@/contexts/verification-context'
import { BalanceProvider } from '@/contexts/balance-context'
import { Toaster } from '@/components/ui/sonner'
import { useModalAwareToasts } from '@/hooks/useModalAwareToasts'
import OptimizedPolkadotRoute from '@/components/OptimizedPolkadotRoute'

import HomePage from './pages/homepage'
import SearchPage from './pages/SearchPage'
import ProfilePage from './pages/ProfilePage'
import { PolkadotWalletProvider } from './contexts/PolkadotWalletContext'
import { EthereumWalletProvider } from './contexts/EthereumWalletContext'
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
          <PolkadotWalletProvider appName="whodb">
            <EthereumWalletProvider>
              <AccountProvider>
                <BalanceProvider>
                  <UserProvider>
                    <WebSocketProvider url={import.meta.env.VITE_APP_CHALLENGES_API_URL || "ws://localhost:8080/ws"}>
                      <SearchProvider>
                        <QueryClientProvider client={queryClient}>
                          <VerificationProvider>
                            <Routes>
                              <Route path="/" element={<HomePage />} />
                              <Route path="/search" element={<SearchPage />} />
                              <Route path="/profile" element={<ProfilePage />} />
                              <Route path="/profile/:network/:address" element={<ProfilePage />} />
                              <Route path="/profile/:address" element={<ProfilePage />} />
                              <Route path="*" element={<div>Page not found</div>} />
                            </Routes>
                          </VerificationProvider>
                        </QueryClientProvider>
                      </SearchProvider>
                    </WebSocketProvider>
                    <Toaster />
                  </UserProvider>
                </BalanceProvider>
              </AccountProvider>
            </EthereumWalletProvider>
          </PolkadotWalletProvider>
        </NetworkProvider>
      </ThemeProvider>
    </div>
  )
}
