import { useState, useEffect, useCallback } from "react"
import { SS58String } from "polkadot-api"
import { usePolkadotApi } from "@/contexts/PolkadotApiContext"

export interface ProxyDefinition {
  delegate: SS58String      // The account that CAN act as proxy
  proxyType: string         // "Any", "NonTransfer", "Governance", "IdentityJudgement", etc.
  delay: number             // Announcement delay in blocks
}

export interface ProxiedAccount {
  address: SS58String       // The account being proxied (the "real" account)
  proxyType: string
  delay: number
}

export interface ProxyState {
  // Accounts that can act ON BEHALF of this account (this account gave them proxy rights)
  proxiesOf: ProxyDefinition[]
  // Accounts this account CAN ACT AS (accounts that gave this account proxy rights)
  canActAs: ProxiedAccount[]
  isLoading: boolean
  error: string | null
  refetch: () => void
}

/**
 * Hook to fetch proxy relationships for an account
 * - proxiesOf: who can act on behalf of this account
 * - canActAs: which accounts this account can act as (requires indexer or scanning)
 */
export function useProxies(address: SS58String | null): ProxyState {
  const { typedApi } = usePolkadotApi()
  const [proxiesOf, setProxiesOf] = useState<ProxyDefinition[]>([])
  const [canActAs, setCanActAs] = useState<ProxiedAccount[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const refetch = useCallback(() => setRefreshKey(k => k + 1), [])

  useEffect(() => {
    if (!address || !typedApi) {
      setProxiesOf([])
      setCanActAs([])
      return
    }

    let cancelled = false
    setIsLoading(true)
    setError(null)

    const fetchProxies = async () => {
      try {
        // Fetch proxies OF this account (accounts that can act on behalf of this one)
        // Using @polkadot/api style
        const proxiesResult = await (typedApi as any).query.proxy?.proxies(address)

        if (cancelled) return

        if (proxiesResult) {
          const [proxiesList] = proxiesResult
          const parsed: ProxyDefinition[] = proxiesList.map((p: any) => ({
            delegate: p.delegate.toString() as SS58String,
            proxyType: p.proxyType.toString(),
            delay: p.delay.toNumber?.() || 0,
          }))
          setProxiesOf(parsed)
        }

        // Note: Finding accounts this address can act AS requires either:
        // 1. An indexer (subscan, subsquid)
        // 2. Scanning all proxy storage (expensive)
        // 3. User manually adding accounts they know about
        // For now, we'll support manual addition via localStorage

        const storedCanActAs = localStorage.getItem(`proxy_canActAs_${address}`)
        if (storedCanActAs) {
          try {
            setCanActAs(JSON.parse(storedCanActAs))
          } catch {
            setCanActAs([])
          }
        }

      } catch (err) {
        if (!cancelled) {
          console.error("Failed to fetch proxies:", err)
          setError(err instanceof Error ? err.message : "Failed to fetch proxy info")
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    fetchProxies()
    return () => { cancelled = true }
  }, [address, typedApi, refreshKey])

  return { proxiesOf, canActAs, isLoading, error, refetch }
}

/**
 * Add an account that this address can act as (stored in localStorage)
 */
export function addCanActAs(
  myAddress: SS58String,
  targetAddress: SS58String,
  proxyType: string = "Any",
  delay: number = 0
) {
  const key = `proxy_canActAs_${myAddress}`
  const existing = localStorage.getItem(key)
  const list: ProxiedAccount[] = existing ? JSON.parse(existing) : []

  // Don't add duplicates
  if (list.some(p => p.address === targetAddress)) return

  list.push({ address: targetAddress, proxyType, delay })
  localStorage.setItem(key, JSON.stringify(list))
}

/**
 * Remove an account from canActAs list
 */
export function removeCanActAs(myAddress: SS58String, targetAddress: SS58String) {
  const key = `proxy_canActAs_${myAddress}`
  const existing = localStorage.getItem(key)
  if (!existing) return

  const list: ProxiedAccount[] = JSON.parse(existing)
  const filtered = list.filter(p => p.address !== targetAddress)
  localStorage.setItem(key, JSON.stringify(filtered))
}

/**
 * Verify if address A can act as proxy for address B
 */
export async function verifyProxyRelationship(
  api: any,
  proxyAddress: SS58String,  // The account trying to act as proxy
  realAddress: SS58String,   // The account being proxied
  proxyType?: string         // Optional: specific proxy type to check
): Promise<{ valid: boolean; proxyType?: string; delay?: number }> {
  try {
    const proxiesResult = await api.query.proxy?.proxies(realAddress)
    if (!proxiesResult) return { valid: false }

    const [proxiesList] = proxiesResult
    const match = proxiesList.find((p: any) => {
      const delegate = p.delegate.toString()
      const type = p.proxyType.toString()

      if (delegate !== proxyAddress) return false
      if (proxyType && type !== proxyType && type !== "Any") return false

      // For identity operations, need "Any" or "IdentityJudgement" proxy type
      // "NonTransfer" should also work for identity
      return true
    })

    if (match) {
      return {
        valid: true,
        proxyType: match.proxyType.toString(),
        delay: match.delay.toNumber?.() || 0,
      }
    }

    return { valid: false }
  } catch (err) {
    console.error("Failed to verify proxy relationship:", err)
    return { valid: false }
  }
}
