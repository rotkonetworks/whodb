import { useCallback, useEffect, useState } from 'react'
import { useWebSocket } from './index'
import { logger } from '@/utils/logger'

export interface RemailerMessage {
  id: string
  sender_address: string
  recipient_address: string
  content: string
  encrypted: boolean
  timestamp: number
  contact_type: 'email' | 'twitter' | 'matrix' | 'discord'
  destination: string
  status: 'pending' | 'sent' | 'failed'
  network: string
}

export interface SendMessageParams {
  recipient_address: string
  content: string
  encrypted: boolean
  encrypted_content?: string
  contact_type: 'email' | 'twitter' | 'matrix' | 'discord'
  destination: string
  network: string
  transaction_hash?: string
  sender_is_verified?: boolean // Backend will verify this on-chain
}

export interface UseRemailerReturn {
  messages: RemailerMessage[]
  loading: boolean
  error: string | null
  sendMessage: (params: SendMessageParams) => Promise<RemailerMessage>
  deleteMessage: (messageId: string) => Promise<void>
  fetchMessages: (recipientAddress: string) => Promise<void>
  isConnected: boolean
}

export const useRemailer = (): UseRemailerReturn => {
  const wsUrl = import.meta.env.VITE_APP_CHALLENGES_API_URL || 'ws://localhost:8080'

  // Warn about insecure WebSocket in production (but don't crash the app)
  if (import.meta.env.PROD && !wsUrl.startsWith('wss://')) {
    logger.warn(`⚠️ Remailer using insecure WebSocket in production: ${wsUrl}`)
    logger.warn('This should use wss:// - check VITE_APP_CHALLENGES_API_URL environment variable')
  } else {
    logger.info(`🔧 Remailer using WebSocket URL: ${wsUrl} (production: ${import.meta.env.PROD})`)
  }

  const {
    isConnected,
    error: wsError,
    loading: wsLoading,
    sendMessage: wsSendMessage,
    subscribe,
  } = useWebSocket({
    url: wsUrl,
    autoConnect: true,
    reconnectEnabled: true,
  })

  const [messages, setMessages] = useState<RemailerMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Subscribe to remailer message updates
  useEffect(() => {
    const unsubscribe = subscribe((message) => {
      if (message.type === 'remailer_message_update') {
        const updatedMessage: RemailerMessage = message.payload
        setMessages(prev => {
          const index = prev.findIndex(m => m.id === updatedMessage.id)
          if (index >= 0) {
            const updated = [...prev]
            updated[index] = updatedMessage
            return updated
          }
          return [...prev, updatedMessage]
        })
      }
    }, ['remailer_message_update'])

    return unsubscribe
  }, [subscribe])

  const fetchMessages = useCallback(async (recipientAddress: string) => {
    setLoading(true)
    setError(null)

    try {
      const response = await wsSendMessage({
        version: '1.1',
        type: 'remailer_fetch_messages',
        payload: { recipient_address: recipientAddress }
      })

      if (response.error) {
        throw new Error(response.error)
      }

      setMessages(response.payload || [])
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch messages'
      logger.error('Failed to fetch remailer messages:', err)
      setError(errorMsg)
    } finally {
      setLoading(false)
    }
  }, [wsSendMessage])

  const sendMessage = useCallback(async (params: SendMessageParams): Promise<RemailerMessage> => {
    setLoading(true)
    setError(null)

    try {
      const response = await wsSendMessage({
        version: '1.1',
        type: 'remailer_send_message',
        payload: params
      })

      if (response.error) {
        throw new Error(response.error)
      }

      const newMessage: RemailerMessage = response.payload
      setMessages(prev => [...prev, newMessage])

      return newMessage
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to send message'
      logger.error('Failed to send remailer message:', err)
      setError(errorMsg)
      throw err
    } finally {
      setLoading(false)
    }
  }, [wsSendMessage])

  const deleteMessage = useCallback(async (messageId: string) => {
    setLoading(true)
    setError(null)

    try {
      const response = await wsSendMessage({
        version: '1.1',
        type: 'remailer_delete_message',
        payload: { message_id: messageId }
      })

      if (response.error) {
        throw new Error(response.error)
      }

      setMessages(prev => prev.filter(m => m.id !== messageId))
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to delete message'
      logger.error('Failed to delete remailer message:', err)
      setError(errorMsg)
      throw err
    } finally {
      setLoading(false)
    }
  }, [wsSendMessage])

  return {
    messages,
    loading: loading || wsLoading,
    error: error || wsError,
    sendMessage,
    deleteMessage,
    fetchMessages,
    isConnected,
  }
}
