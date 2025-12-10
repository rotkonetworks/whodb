import { WebSocketProvider, SearchProvider } from '@/contexts/web-socket-provider'
import { ReactNode } from 'react'

interface Props {
  children: ReactNode
}

export default function LazySearchProvider({ children }: Props) {
  return (
    <WebSocketProvider
      url={import.meta.env.VITE_APP_CHALLENGES_API_URL || "ws://localhost:8080/ws"}
      autoConnect
    >
      <SearchProvider>
        {children}
      </SearchProvider>
    </WebSocketProvider>
  )
}