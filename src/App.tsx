import { lazy, Suspense } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ThemeProvider } from '@/components/theme-provider-simple'
import { NetworkProvider } from '@/contexts/network-context'
import { UserProvider } from '@/contexts/user-context'
import { VerificationProvider } from '@/contexts/verification-context'
import { BalanceProvider } from '@/contexts/balance-context'
import { ChatProvider } from '@/contexts/ChatContext'
import { Toaster } from '@/components/ui/sonner'
import { useModalAwareToasts } from '@/hooks/useModalAwareToasts'
const ChatWidgetContainer = lazy(() => import('@/components/chat').then(m => ({ default: m.ChatWidgetContainer })))
import { PolkadotWalletProvider } from './contexts/PolkadotWalletContext'
import { EthereumWalletProvider } from './contexts/EthereumWalletContext'
import { PolkadotApiProvider } from './contexts/PolkadotApiContext'
import { AccountProvider } from './contexts/wallet-context'
import { SearchProvider, WebSocketProvider } from './contexts/web-socket-provider'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import HomePage from './pages/homepage'

const SearchPage = lazy(() => import('./pages/SearchPage'))
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
    <div className="i-lucide-loader-2 w-6 h-6 text-pink-500/60 animate-spin" />
  </div>
)

const pageVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.15, ease: 'easeOut' as const } },
  exit: { opacity: 0, transition: { duration: 0.1, ease: 'easeIn' as const } },
}

function AnimatedRoutes() {
  const location = useLocation()

  return (
    <AnimatePresence mode="wait">
      <motion.div key={location.pathname} {...pageVariants}>
        <Suspense fallback={<PageLoader />}>
          <Routes location={location}>
            <Route path="/" element={<HomePage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/profile/:network/:address" element={<ProfilePage />} />
            <Route path="/profile/:address" element={<ProfilePage />} />
            <Route path="*" element={<div className="min-h-screen bg-gray-900 flex items-center justify-center text-gray-500">Page not found</div>} />
          </Routes>
        </Suspense>
      </motion.div>
    </AnimatePresence>
  )
}

export default function App() {
  useModalAwareToasts()

  return (
    <div className="bg-gray-900 text-white antialiased">
      <ThemeProvider>
        <NetworkProvider>
          <PolkadotWalletProvider appName="whodb">
            <EthereumWalletProvider>
              <AccountProvider>
                <PolkadotApiProvider>
                  <BalanceProvider>
                    <UserProvider>
                      <WebSocketProvider url={import.meta.env.VITE_APP_CHALLENGES_API_URL || "ws://localhost:8080/ws"}>
                        <SearchProvider>
                          <QueryClientProvider client={queryClient}>
                            <VerificationProvider>
                              <ChatProvider>
                                <AnimatedRoutes />
                                <Suspense fallback={null}><ChatWidgetContainer /></Suspense>
                              </ChatProvider>
                            </VerificationProvider>
                          </QueryClientProvider>
                        </SearchProvider>
                      </WebSocketProvider>
                      <Toaster />
                    </UserProvider>
                  </BalanceProvider>
                </PolkadotApiProvider>
              </AccountProvider>
            </EthereumWalletProvider>
          </PolkadotWalletProvider>
        </NetworkProvider>
      </ThemeProvider>
    </div>
  )
}
