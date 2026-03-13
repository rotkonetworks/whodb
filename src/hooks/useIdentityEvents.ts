import { useState, useEffect, useCallback, useRef } from 'react'

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

const MAX_RETRIES = 2

function getHttpApiBase(): string {
  // Prefer explicit HTTP API URL
  if (import.meta.env.VITE_APP_HTTP_API_URL) {
    return import.meta.env.VITE_APP_HTTP_API_URL
  }
  // In dev mode, use the Vite proxy
  if (import.meta.env.DEV) {
    return '/api'
  }
  // Fall back to deriving from WebSocket URL
  const wsUrl = import.meta.env.VITE_APP_CHALLENGES_API_URL || 'ws://localhost:8080/ws'
  return wsUrl
    .replace(/^wss:\/\//, 'https://')
    .replace(/^ws:\/\//, 'http://')
    .replace(/\/ws$/, '')
}

export function useIdentityEvents(wallet: string | undefined, network: string | undefined) {
  const [events, setEvents] = useState<IdentityEvent[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const retriesRef = useRef(0)
  const abortRef = useRef<AbortController | null>(null)

  const fetchEvents = useCallback(async () => {
    if (!wallet || !network) {
      setEvents([])
      return
    }

    if (retriesRef.current >= MAX_RETRIES) return

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setIsLoading(true)
    setError(null)

    try {
      const httpBase = getHttpApiBase()
      const backendNetwork = network
        .replace('_people', '')
        .replace('ksmcc3', 'kusama')

      const response = await fetch(
        `${httpBase}/events/${backendNetwork}/${wallet}?limit=100`,
        { signal: controller.signal }
      )

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()
      setEvents(data)
      retriesRef.current = 0
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      retriesRef.current++
      setError('Unable to load history')
      setEvents([])
    } finally {
      setIsLoading(false)
    }
  }, [wallet, network])

  useEffect(() => {
    retriesRef.current = 0
  }, [wallet, network])

  useEffect(() => {
    fetchEvents()
    return () => { abortRef.current?.abort() }
  }, [fetchEvents])

  const refetch = useCallback(() => {
    retriesRef.current = 0
    fetchEvents()
  }, [fetchEvents])

  return { events, isLoading, error, refetch }
}
