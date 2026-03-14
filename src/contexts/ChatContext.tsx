import { createContext, useContext, useState, useCallback, useMemo, ReactNode } from "react"

export interface ChatConfig {
  id: string
  recipientAddress: string
  recipientName?: string
  recipientEmail?: string
  recipientTwitter?: string
  recipientMatrix?: string
  recipientDiscord?: string
  recipientPgpFingerprint?: string | null
  recipientIsVerified?: boolean
  network: string
  contactType: 'email' | 'twitter' | 'matrix' | 'discord'
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
      // Check if chat with same recipient and contact type already exists
      const existingIndex = prev.findIndex(
        c => c.recipientAddress === config.recipientAddress && c.contactType === config.contactType
      )

      if (existingIndex !== -1) {
        // Maximize existing chat and bring it to front
        const updated = [...prev]
        const existing = updated.splice(existingIndex, 1)[0]
        existing.isMinimized = false
        updated.push(existing)
        return updated
      }

      // Create new chat
      const id = `${config.recipientAddress}-${config.contactType}-${Date.now()}`
      const newChat: ChatConfig = {
        ...config,
        id,
        isMinimized: false,
      }

      // Limit to 3 open chats max, minimize oldest if adding more
      if (prev.length >= 3) {
        const updated = [...prev]
        // Minimize the oldest non-minimized chat
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
