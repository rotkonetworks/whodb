import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import { ThemeProvider } from '@/components/theme-provider-simple'
import { NetworkProvider } from '@/contexts/network-context'
import { UserProvider } from '@/contexts/user-context'
import { VerificationProvider } from '@/contexts/verification-context'
import { BalanceProvider } from '@/contexts/balance-context'
import { ChatProvider } from '@/contexts/ChatContext'
import { Toaster } from '@/components/ui/sonner'
import { useModalAwareToasts } from '@/hooks/useModalAwareToasts'
import { ChatWidgetContainer } from '@/components/chat'
import { PolkadotWalletProvider } from './contexts/PolkadotWalletContext'
import { EthereumWalletProvider } from './contexts/EthereumWalletContext'
import { PolkadotApiProvider } from './contexts/PolkadotApiContext'
import { AccountProvider } from './contexts/wallet-context'
import { SearchProvider, WebSocketProvider } from './contexts/web-socket-provider'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import HomePage from './pages/homepage'
import SearchPage from './pages/SearchPage'

const RegisterPage = lazy(() => import('./pages/RegisterPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
    },
  },
})

const PageLoader = () => (
  <div className="min-h-screen bg-gray-900 flex items-center justify-center">
    <div className="text-gray-400">Loading...</div>
  </div>
)

export default function App() {
  useModalAwareToasts()

  return (
    <div className="bg-gray-900 text-white antialiased">
      <ThemeProvider>
        <NetworkProvider>
          <PolkadotWalletProvider appName="whodb">
            <EthereumWalletProvider>
              <PolkadotApiProvider>
                <AccountProvider>
                  <BalanceProvider>
                    <UserProvider>
                      <WebSocketProvider url={import.meta.env.VITE_APP_CHALLENGES_API_URL || "ws://localhost:8080/ws"}>
                        <SearchProvider>
                          <QueryClientProvider client={queryClient}>
                            <VerificationProvider>
                              <ChatProvider>
                                <Suspense fallback={<PageLoader />}>
                                  <Routes>
                                    <Route path="/" element={<HomePage />} />
                                    <Route path="/search" element={<SearchPage />} />
                                    <Route path="/register" element={<RegisterPage />} />
                                    <Route path="/profile" element={<ProfilePage />} />
                                    <Route path="/profile/:network/:address" element={<ProfilePage />} />
                                    <Route path="/profile/:address" element={<ProfilePage />} />
                                    <Route path="*" element={<div className="min-h-screen bg-gray-900 flex items-center justify-center">Page not found</div>} />
                                  </Routes>
                                </Suspense>
                                <ChatWidgetContainer />
                              </ChatProvider>
                            </VerificationProvider>
                          </QueryClientProvider>
                        </SearchProvider>
                      </WebSocketProvider>
                      <Toaster />
                    </UserProvider>
                  </BalanceProvider>
                </AccountProvider>
              </PolkadotApiProvider>
            </EthereumWalletProvider>
          </PolkadotWalletProvider>
        </NetworkProvider>
      </ThemeProvider>
    </div>
  )
}
