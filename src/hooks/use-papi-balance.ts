import { useEffect, useState } from "react"
import { SS58String } from "polkadot-api"
import BigNumber from "bignumber.js"
import { getPapiClient } from "@/lib/papi-client"

/**
 * PAPI-based balance hook following reactive principles.
 * Uses Polkadot API (PAPI) instead of deprecated Polkadot.js.
 *
 * Ryan Carniato principle: Derived state, subscriptions that auto-update
 */
export const usePapiBalance = (address?: SS58String, chainId?: string) => {
  const [balance, setBalance] = useState<BigNumber | null>(null)
  const [nonce, setNonce] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Reset state when dependencies change
    setIsLoading(true)
    setBalance(null)
    setNonce(null)
    setError(null)

    if (!address || !chainId || address.length === 0) {
      setIsLoading(false)
      return
    }

    let subscription: any = null
    let mounted = true

    const setupSubscription = async () => {
      try {
        const client = await getPapiClient(chainId, false)

        // Get the typed API with descriptors
        const descriptors = await import("@polkadot-api/descriptors")
        const typedApi = client.getTypedApi(descriptors[chainId])

        if (!mounted) return

        // Subscribe to system.account for real-time updates
        subscription = typedApi.query.System.Account.watchValue(address).subscribe({
          next: (accountInfo) => {
            if (!mounted) return

            const free = BigNumber(accountInfo.data.free.toString())
            const frozen = BigNumber(accountInfo.data.frozen.toString())
            const reserved = BigNumber(accountInfo.data.reserved.toString())

            // Available = free - max(frozen, reserved)
            const availableBalance = free.minus(BigNumber.max(frozen, reserved))

            setBalance(availableBalance)
            setNonce(accountInfo.nonce)
            setIsLoading(false)
            setError(null)
          },
          error: (err) => {
            setError(err.message || "Failed to load balance")
            setIsLoading(false)
          }
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to connect")
        setIsLoading(false)
      }
    }

    setupSubscription()

    return () => {
      mounted = false
      subscription?.unsubscribe()
    }
  }, [address, chainId])

  return { balance, nonce, isLoading, error }
}
