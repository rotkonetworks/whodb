import { WebSocketProvider, SearchProvider } from '@/contexts/web-socket-provider'
import { ReactNode } from 'react'
import { getWebSocketUrl } from '@/lib/websocket-url'

interface Props {
  children: ReactNode
}

export default function LazySearchProvider({ children }: Props) {
  return (
    <WebSocketProvider
      url={getWebSocketUrl()}
      autoConnect
    >
      <SearchProvider>
        {children}
      </SearchProvider>
    </WebSocketProvider>
  )
}