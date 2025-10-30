import { useCallback, useState } from 'react'
import { WebSocketHookReturn } from '.'
import { logger } from '@/utils/logger'

export interface VerifyPGPKeyAutomatedPayload {
  network: string
  account: string
}

export interface UploadPGPKeyPayload {
  network: string
  account: string
  fingerprint: string
  armored_key: string
}

export interface VerifyPGPKeyManualPayload {
  network: string
  account: string
  signed_challenge: string
  pubkey: string
}

export interface FetchPGPKeyPayload {
  fingerprint: string
}

export interface UpdateRemailerSettingsPayload {
  network: string
  account: string
  remailer_enabled: boolean
  remailer_registered_only: boolean
  require_verified_pgp: boolean
  signature: string
  timestamp: number
}

export interface PGPWebSocketReturn {
  loading: boolean
  error: string | null
  verifyAutomated: (payload: VerifyPGPKeyAutomatedPayload) => Promise<void>
  uploadKey: (payload: UploadPGPKeyPayload) => Promise<{ fingerprint?: string }>
  verifyManual: (payload: VerifyPGPKeyManualPayload) => Promise<void>
  fetchKey: (payload: FetchPGPKeyPayload) => Promise<{ armored_key?: string; fingerprint?: string }>
  updateRemailerSettings: (payload: UpdateRemailerSettingsPayload) => Promise<void>
}

/**
 * PGP WebSocket hook that provides three methods of PGP verification:
 * 1. Automated - fetches from keyserver automatically
 * 2. Upload - user uploads key manually
 * 3. Manual - signature-based verification
 */
export const usePGPWebSocket = (webSocketInstance: WebSocketHookReturn): PGPWebSocketReturn => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const verifyAutomated = useCallback(
    async (payload: VerifyPGPKeyAutomatedPayload): Promise<void> => {
      setLoading(true)
      setError(null)

      try {
        logger.log('Attempting automated PGP verification', payload)

        const response = await webSocketInstance.sendMessage({
          version: '1.1',
          type: 'VerifyPGPKeyAutomated',
          payload,
        })

        logger.log('Automated verification response:', response)

        if (response.type === 'error') {
          throw new Error(response.message || 'Automated verification failed')
        }

        if (response.type === 'JsonResult' && response.payload?.type === 'ok') {
          logger.log('Automated PGP verification successful')
        } else {
          throw new Error('Unexpected response format')
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Automated verification failed'
        logger.error('Automated verification error:', errorMessage)
        setError(errorMessage)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [webSocketInstance]
  )

  const uploadKey = useCallback(
    async (payload: UploadPGPKeyPayload): Promise<{ fingerprint?: string }> => {
      setLoading(true)
      setError(null)

      try {
        logger.log('Uploading PGP key', {
          network: payload.network,
          account: payload.account,
          fingerprint: payload.fingerprint
        })

        const response = await webSocketInstance.sendMessage({
          version: '1.1',
          type: 'UploadPGPKey',
          payload,
        })

        logger.log('Upload key response:', response)

        if (response.type === 'error') {
          throw new Error(response.message || 'Key upload failed')
        }

        if (response.type === 'JsonResult' && response.payload?.type === 'ok') {
          logger.log('PGP key uploaded successfully')
          return { fingerprint: response.payload.fingerprint }
        } else {
          throw new Error('Unexpected response format')
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Key upload failed'
        logger.error('Upload key error:', errorMessage)
        setError(errorMessage)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [webSocketInstance]
  )

  const verifyManual = useCallback(
    async (payload: VerifyPGPKeyManualPayload): Promise<void> => {
      setLoading(true)
      setError(null)

      try {
        logger.log('Attempting manual PGP verification', {
          network: payload.network,
          account: payload.account
        })

        const response = await webSocketInstance.sendMessage({
          version: '1.1',
          type: 'VerifyPGPKey',
          payload,
        })

        logger.log('Manual verification response:', response)

        if (response.type === 'error') {
          throw new Error(response.message || 'Manual verification failed')
        }

        if (response.type === 'JsonResult' && response.payload?.type === 'ok') {
          logger.log('Manual PGP verification successful')
        } else {
          throw new Error('Unexpected response format')
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Manual verification failed'
        logger.error('Manual verification error:', errorMessage)
        setError(errorMessage)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [webSocketInstance]
  )

  const fetchKey = useCallback(
    async (payload: FetchPGPKeyPayload): Promise<{ armored_key?: string; fingerprint?: string }> => {
      setLoading(true)
      setError(null)

      try {
        logger.log('Fetching PGP key', payload)

        const response = await webSocketInstance.sendMessage({
          version: '1.1',
          type: 'FetchPGPKey',
          payload,
        })

        logger.log('Fetch key response:', response)

        if (response.type === 'error') {
          throw new Error(response.message || 'Key fetch failed')
        }

        if (response.type === 'JsonResult' && response.payload?.type === 'ok') {
          logger.log('PGP key fetched successfully')
          return {
            armored_key: response.payload.armored_key,
            fingerprint: response.payload.fingerprint,
          }
        } else {
          throw new Error('Unexpected response format')
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Key fetch failed'
        logger.error('Fetch key error:', errorMessage)
        setError(errorMessage)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [webSocketInstance]
  )

  const updateRemailerSettings = useCallback(
    async (payload: UpdateRemailerSettingsPayload): Promise<void> => {
      setLoading(true)
      setError(null)

      try {
        logger.log('Updating remailer settings', payload)

        const response = await webSocketInstance.sendMessage({
          version: '1.1',
          type: 'UpdateRemailerSettings',
          payload,
        })

        logger.log('Update remailer settings response:', response)

        if (response.type === 'error') {
          throw new Error(response.message || 'Settings update failed')
        }

        if (response.type === 'JsonResult' && response.payload?.type === 'ok') {
          logger.log('Remailer settings updated successfully')
        } else {
          throw new Error('Unexpected response format')
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Settings update failed'
        logger.error('Update remailer settings error:', errorMessage)
        setError(errorMessage)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [webSocketInstance]
  )

  return {
    loading,
    error,
    verifyAutomated,
    uploadKey,
    verifyManual,
    fetchKey,
    updateRemailerSettings,
  }
}
