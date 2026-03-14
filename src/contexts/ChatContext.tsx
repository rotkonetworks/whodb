import { createContext, useContext, useState, useCallback, useMemo, ReactNode } from "react"

export interface ChatConfig {
  id: string
  recipientAddress: string
  recipientName?: string
  recipientPgpFingerprint?: string | null
  recipientIsVerified?: boolean
  network: string
  isMinimized: boolean
}

interface ChatContextType {
  openChats: ChatConfig[]
  openChat: (config: Omit<ChatConfig, 'id' | 'isMinimized'>) => void
  closeChat: (id: string) => void
  minimizeChat: (id: string) => void
  maximizeChat: (id: string) => void
  closeAllChats: () => void
}

const ChatContext = createContext<ChatContextType | null>(null)

export function ChatProvider({ children }: { children: ReactNode }) {
  const [openChats, setOpenChats] = useState<ChatConfig[]>([])

  const openChat = useCallback((config: Omit<ChatConfig, 'id' | 'isMinimized'>) => {
    setOpenChats(prev => {
      const existingIndex = prev.findIndex(
        c => c.recipientAddress === config.recipientAddress
      )

      if (existingIndex !== -1) {
        const updated = [...prev]
        const existing = updated.splice(existingIndex, 1)[0]
        existing.isMinimized = false
        updated.push(existing)
        return updated
      }

      const id = `${config.recipientAddress}-${Date.now()}`
      const newChat: ChatConfig = {
        ...config,
        id,
        isMinimized: false,
      }

      if (prev.length >= 3) {
        const updated = [...prev]
        const toMinimize = updated.find(c => !c.isMinimized)
        if (toMinimize) {
          toMinimize.isMinimized = true
        }
        return [...updated, newChat]
      }

      return [...prev, newChat]
    })
  }, [])

  const closeChat = useCallback((id: string) => {
    setOpenChats(prev => prev.filter(c => c.id !== id))
  }, [])

  const minimizeChat = useCallback((id: string) => {
    setOpenChats(prev =>
      prev.map(c => c.id === id ? { ...c, isMinimized: true } : c)
    )
  }, [])

  const maximizeChat = useCallback((id: string) => {
    setOpenChats(prev =>
      prev.map(c => c.id === id ? { ...c, isMinimized: false } : c)
    )
  }, [])

  const closeAllChats = useCallback(() => {
    setOpenChats([])
  }, [])

  return (
    <ChatContext.Provider value={useMemo(() => ({
      openChats,
      openChat,
      closeChat,
      minimizeChat,
      maximizeChat,
      closeAllChats,
    }), [openChats, openChat, closeChat, minimizeChat, maximizeChat, closeAllChats])}>
      {children}
    </ChatContext.Provider>
  )
}

export function useChat() {
  const context = useContext(ChatContext)
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider')
  }
  return context
}
