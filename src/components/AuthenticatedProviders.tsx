import { NetworkProvider } from '@/contexts/network-context'
import { UserProvider } from '@/contexts/user-context'
import { VerificationProvider } from '@/contexts/verification-context'
import { BalanceProvider } from '@/contexts/balance-context'
import { PolkadotWalletProvider } from '@/contexts/PolkadotWalletContext'
import { PolkadotApiProvider } from '@/contexts/PolkadotApiContext'
import { AccountProvider } from '@/contexts/wallet-context'
import { SearchProvider, WebSocketProvider } from '@/contexts/web-socket-provider'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode } from 'react'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
    },
  },
})

interface Props {
  children: ReactNode
}

export default function AuthenticatedProviders({ children }: Props) {
  return (
    <NetworkProvider>
      <PolkadotWalletProvider appName="Whodb Registrar">
        <PolkadotApiProvider>
          <AccountProvider>
            <BalanceProvider>
              <UserProvider>
                <WebSocketProvider url={import.meta.env.VITE_APP_CHALLENGES_API_URL || "ws://localhost:8080/ws"} autoConnect>
                  <SearchProvider>
                    <QueryClientProvider client={queryClient}>
                      <VerificationProvider>
                        {children}
                      </VerificationProvider>
                    </QueryClientProvider>
                  </SearchProvider>
                </WebSocketProvider>
              </UserProvider>
            </BalanceProvider>
          </AccountProvider>
        </PolkadotApiProvider>
      </PolkadotWalletProvider>
    </NetworkProvider>
  )
}