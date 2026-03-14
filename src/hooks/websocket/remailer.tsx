import { useCallback, useState } from 'react'
import { useWebSocket } from './index'
import { useAccount } from '@/contexts/wallet-context'
import { logger } from '@/utils/logger'

export interface SendMessageParams {
  recipient: string
  recipient_network: string
  message: string
  network: string
}

export interface UseRemailerReturn {
  loading: boolean
  error: string | null
  sendMessage: (params: SendMessageParams) => Promise<void>
  blockSender: (params: BlockParams) => Promise<void>
  unblockSender: (params: UnblockParams) => Promise<void>
  getBlocked: (params: GetBlockedParams) => Promise<string[]>
  isConnected: boolean
}

export interface BlockParams {
  network: string
  blocked_address: string
  reason?: string
}

export interface UnblockParams {
  network: string
  blocked_address: string
}

export interface GetBlockedParams {
  network: string
}

export const useRemailer = (): UseRemailerReturn => {
  const wsUrl = import.meta.env.VITE_APP_CHALLENGES_API_URL || 'ws://localhost:8080'

  const {
    isConnected,
    error: wsError,
    loading: wsLoading,
    sendMessage: wsSendMessage,
  } = useWebSocket({
    url: wsUrl,
    autoConnect: true,
    reconnectEnabled: true,
  })

  const { address, signMessage: walletSign } = useAccount()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const signPayload = useCallback(async (message: string): Promise<{ signature: string; timestamp: number }> => {
    const timestamp = Date.now()
    const fullMessage = `${message}\nTimestamp: ${timestamp}`
    const { signature } = await walletSign(fullMessage)
    return { signature, timestamp }
  }, [walletSign])

  const sendMessage = useCallback(async (params: SendMessageParams): Promise<void> => {
    if (!address) throw new Error('No wallet connected')

    setLoading(true)
    setError(null)

    try {
      const msg = `Send message\nFrom: ${address}\nTo: ${params.recipient}\nNetwork: ${params.network}\nRecipient Network: ${params.recipient_network}\nMessage: ${params.message}`
      const { signature, timestamp } = await signPayload(msg)

      const response = await wsSendMessage({
        version: '1.1',
        type: 'RemailerSendMessage',
        payload: {
          network: params.network,
          sender: address,
          recipient: params.recipient,
          recipient_network: params.recipient_network,
          message: params.message,
          signature,
          timestamp,
        }
      })

      if (response?.payload?.type === 'error') {
        throw new Error(response.payload.message)
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to send message'
      logger.error('remailer send failed:', err)
      setError(errorMsg)
      throw err
    } finally {
      setLoading(false)
    }
  }, [address, wsSendMessage, signPayload])

  const blockSender = useCallback(async (params: BlockParams): Promise<void> => {
    if (!address) throw new Error('No wallet connected')

    setLoading(true)
    setError(null)

    try {
      const msg = `Block sender\nAccount: ${address}\nNetwork: ${params.network}\nBlocked: ${params.blocked_address}`
      const { signature, timestamp } = await signPayload(msg)

      const response = await wsSendMessage({
        version: '1.1',
        type: 'RemailerBlock',
        payload: {
          network: params.network,
          account: address,
          blocked_address: params.blocked_address,
          reason: params.reason,
          signature,
          timestamp,
        }
      })

      if (response?.payload?.type === 'error') {
        throw new Error(response.payload.message)
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to block sender'
      logger.error('remailer block failed:', err)
      setError(errorMsg)
      throw err
    } finally {
      setLoading(false)
    }
  }, [address, wsSendMessage, signPayload])

  const unblockSender = useCallback(async (params: UnblockParams): Promise<void> => {
    if (!address) throw new Error('No wallet connected')

    setLoading(true)
    setError(null)

    try {
      const msg = `Unblock sender\nAccount: ${address}\nNetwork: ${params.network}\nBlocked: ${params.blocked_address}`
      const { signature, timestamp } = await signPayload(msg)

      const response = await wsSendMessage({
        version: '1.1',
        type: 'RemailerUnblock',
        payload: {
          network: params.network,
          account: address,
          blocked_address: params.blocked_address,
          signature,
          timestamp,
        }
      })

      if (response?.payload?.type === 'error') {
        throw new Error(response.payload.message)
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to unblock sender'
      logger.error('remailer unblock failed:', err)
      setError(errorMsg)
      throw err
    } finally {
      setLoading(false)
    }
  }, [address, wsSendMessage, signPayload])

  const getBlocked = useCallback(async (params: GetBlockedParams): Promise<string[]> => {
    if (!address) throw new Error('No wallet connected')

    setLoading(true)
    setError(null)

    try {
      const msg = `Get blocked\nAccount: ${address}\nNetwork: ${params.network}`
      const { signature, timestamp } = await signPayload(msg)

      const response = await wsSendMessage({
        version: '1.1',
        type: 'RemailerGetBlocked',
        payload: {
          network: params.network,
          account: address,
          signature,
          timestamp,
        }
      })

      if (response?.payload?.type === 'error') {
        throw new Error(response.payload.message)
      }

      return response?.payload?.blocked || []
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get blocked list'
      logger.error('remailer get blocked failed:', err)
      setError(errorMsg)
      throw err
    } finally {
      setLoading(false)
    }
  }, [address, wsSendMessage, signPayload])

  return {
    loading: loading || wsLoading,
    error: error || wsError,
    sendMessage,
    blockSender,
    unblockSender,
    getBlocked,
    isConnected,
  }
}
