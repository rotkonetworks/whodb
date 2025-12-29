import { useState, useEffect, useCallback } from 'react'

export type IdentityEvent = {
  id: number
  wallet_id: string
  network: string
  event_type: string
  block_number: number
  block_hash: string
  registrar_index: number | null
  created_at: string
}

export function useIdentityEvents(wallet: string | undefined, network: string | undefined) {
  const [events, setEvents] = useState<IdentityEvent[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchEvents = useCallback(async () => {
    if (!wallet || !network) {
      setEvents([])
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Get base URL from websocket URL (remove /ws and convert wss:// to https://)
      const wsUrl = import.meta.env.VITE_APP_CHALLENGES_API_URL || 'ws://localhost:8080/ws'
      const httpUrl = wsUrl
        .replace(/^wss:\/\//, 'https://')
        .replace(/^ws:\/\//, 'http://')
        .replace(/\/ws$/, '')

      // Map frontend network names to backend format
      const backendNetwork = network
        .replace('_people', '')
        .replace('ksmcc3', 'kusama')

      const response = await fetch(`${httpUrl}/events/${backendNetwork}/${wallet}?limit=100`)

      if (!response.ok) {
        throw new Error(`Failed to fetch events: ${response.status}`)
      }

      const data = await response.json()
      setEvents(data)
    } catch (err) {
      console.error('Failed to fetch identity events:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch events')
      setEvents([])
    } finally {
      setIsLoading(false)
    }
  }, [wallet, network])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  return { events, isLoading, error, refetch: fetchEvents }
}
