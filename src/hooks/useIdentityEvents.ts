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
  if (import.meta.env.VITE_APP_HTTP_API_URL) {
    return import.meta.env.VITE_APP_HTTP_API_URL
  }
  if (import.meta.env.DEV) {
    return '/api'
  }
  const wsUrl = import.meta.env.VITE_APP_CHALLENGES_API_URL || 'ws://localhost:8080/ws'
  return wsUrl
    .replace(/^wss:\/\//, 'https://')
    .replace(/^ws:\/\//, 'http://')
    .replace(/\/ws$/, '')
}

function getWsUrl(): string {
  return import.meta.env.VITE_APP_CHALLENGES_API_URL || 'ws://localhost:8080/ws'
}

/** Fetch history via WebSocket GetAccountHistory message */
async function fetchViaWebSocket(wallet: string, network: string, signal: AbortSignal): Promise<IdentityEvent[]> {
  const wsUrl = getWsUrl()
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl)
    let settled = false

    const cleanup = () => {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close()
      }
    }

    signal.addEventListener('abort', () => {
      if (!settled) {
        settled = true
        cleanup()
        reject(new DOMException('Aborted', 'AbortError'))
      }
    })

    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true
        cleanup()
        reject(new Error('WebSocket timeout'))
      }
    }, 10000)

    ws.onopen = () => {
      const backendNetwork = network
        .replace('_people', '')
        .replace('ksmcc3', 'kusama')
      ws.send(JSON.stringify({
        version: '1.1',
        type: 'GetAccountHistory',
        payload: { account: wallet, network: backendNetwork },
      }))
    }

    ws.onmessage = (event) => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      try {
        const data = JSON.parse(event.data)
        if (Array.isArray(data)) {
          resolve(data)
        } else if (data.type === 'error') {
          reject(new Error(data.message || 'WebSocket error'))
        } else {
          resolve([])
        }
      } catch {
        reject(new Error('Invalid response'))
      }
      cleanup()
    }

    ws.onerror = () => {
      if (!settled) {
        settled = true
        clearTimeout(timeout)
        reject(new Error('WebSocket connection failed'))
      }
    }
  })
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

    const backendNetwork = network
      .replace('_people', '')
      .replace('ksmcc3', 'kusama')

    // Try HTTP first, fall back to WebSocket
    try {
      const httpBase = getHttpApiBase()
      const response = await fetch(
        `${httpBase}/events/${backendNetwork}/${wallet}?limit=100`,
        { signal: controller.signal }
      )

      if (!response.ok) throw new Error(`HTTP ${response.status}`)

      const data = await response.json()
      setEvents(data)
      retriesRef.current = 0
      setIsLoading(false)
      return
    } catch (err) {
      if ((err as Error).name === 'AbortError') { setIsLoading(false); return }
      // HTTP failed, try WebSocket fallback
    }

    try {
      const data = await fetchViaWebSocket(wallet, network, controller.signal)
      setEvents(data)
      retriesRef.current = 0
    } catch (err) {
      if ((err as Error).name === 'AbortError') { setIsLoading(false); return }
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
