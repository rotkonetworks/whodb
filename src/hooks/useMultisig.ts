import { useState, useEffect, useCallback, useMemo } from "react"
import { SS58String } from "polkadot-api"
import { usePolkadotApi } from "@/contexts/PolkadotApiContext"
import { encodeAddress, decodeAddress, createKeyMulti } from "@polkadot/util-crypto"
import { CHAINS } from "@/polkadot-api/chain-config"

export interface MultisigAccount {
  address: SS58String
  signatories: SS58String[]
  threshold: number
  name?: string
}

export interface PendingMultisigCall {
  callHash: string
  when: { height: number; index: number }
  depositor: SS58String
  approvals: SS58String[]
  callData?: string
}

export interface MultisigState {
  multisigs: MultisigAccount[]
  pendingCalls: PendingMultisigCall[]
  isLoading: boolean
  error: string | null
  addMultisig: (signatories: SS58String[], threshold: number, name?: string) => void
  removeMultisig: (address: SS58String) => void
  refetch: () => void
}

const STORAGE_KEY = "whodb_multisigs"

/**
 * Derive multisig address from signatories and threshold
 */
export function deriveMultisigAddress(
  signatories: SS58String[],
  threshold: number,
  ss58Format: number = 0
): SS58String {
  // Sort signatories (required for deterministic address)
  const sorted = [...signatories].sort()
  const publicKeys = sorted.map(addr => decodeAddress(addr))
  const multiAddress = createKeyMulti(publicKeys, threshold)
  return encodeAddress(multiAddress, ss58Format) as SS58String
}

/**
 * Hook to manage multisig accounts
 */
export function useMultisig(
  ownerAddress: SS58String | null,
  chainId?: string
): MultisigState {
  const { typedApi } = usePolkadotApi()
  const [multisigs, setMultisigs] = useState<MultisigAccount[]>([])
  const [pendingCalls, setPendingCalls] = useState<PendingMultisigCall[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const ss58Format = useMemo(() => {
    if (!chainId) return 0
    const chain = CHAINS[chainId as keyof typeof CHAINS]
    return chain?.ss58Format || 0
  }, [chainId])

  const refetch = useCallback(() => setRefreshKey(k => k + 1), [])

  // Load multisigs from localStorage
  useEffect(() => {
    if (!ownerAddress) {
      setMultisigs([])
      return
    }

    const stored = localStorage.getItem(`${STORAGE_KEY}_${ownerAddress}`)
    if (stored) {
      try {
        setMultisigs(JSON.parse(stored))
      } catch {
        setMultisigs([])
      }
    }
  }, [ownerAddress])

  // Fetch pending multisig calls
  useEffect(() => {
    if (!ownerAddress || !typedApi || multisigs.length === 0) {
      setPendingCalls([])
      return
    }

    let cancelled = false
    setIsLoading(true)

    const fetchPending = async () => {
      try {
        const allPending: PendingMultisigCall[] = []

        for (const msig of multisigs) {
          // Query multisig storage for pending calls
          const multisigEntries = await (typedApi as any).query.multisig?.multisigs?.entries(msig.address)

          if (cancelled) return

          if (multisigEntries) {
            for (const [key, value] of multisigEntries) {
              if (!value.isSome) continue
              const data = value.unwrap()

              allPending.push({
                callHash: key.args[1].toHex(),
                when: {
                  height: data.when.height.toNumber(),
                  index: data.when.index.toNumber(),
                },
                depositor: data.depositor.toString() as SS58String,
                approvals: data.approvals.map((a: any) => a.toString() as SS58String),
              })
            }
          }
        }

        if (!cancelled) {
          setPendingCalls(allPending)
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to fetch pending multisig calls:", err)
          setError(err instanceof Error ? err.message : "Failed to fetch multisig data")
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    fetchPending()
    return () => { cancelled = true }
  }, [ownerAddress, typedApi, multisigs, refreshKey])

  const addMultisig = useCallback((
    signatories: SS58String[],
    threshold: number,
    name?: string
  ) => {
    if (!ownerAddress) return

    // Ensure owner is in signatories
    if (!signatories.includes(ownerAddress)) {
      signatories = [...signatories, ownerAddress]
    }

    const address = deriveMultisigAddress(signatories, threshold, ss58Format)

    const newMultisig: MultisigAccount = {
      address,
      signatories,
      threshold,
      name,
    }

    setMultisigs(prev => {
      // Don't add duplicates
      if (prev.some(m => m.address === address)) return prev
      const updated = [...prev, newMultisig]
      localStorage.setItem(`${STORAGE_KEY}_${ownerAddress}`, JSON.stringify(updated))
      return updated
    })
  }, [ownerAddress, ss58Format])

  const removeMultisig = useCallback((address: SS58String) => {
    if (!ownerAddress) return

    setMultisigs(prev => {
      const updated = prev.filter(m => m.address !== address)
      localStorage.setItem(`${STORAGE_KEY}_${ownerAddress}`, JSON.stringify(updated))
      return updated
    })
  }, [ownerAddress])

  return {
    multisigs,
    pendingCalls,
    isLoading,
    error,
    addMultisig,
    removeMultisig,
    refetch,
  }
}

/**
 * Check if an address is a multisig (by checking if it has any pending calls or known config)
 */
export async function isMultisigAddress(api: any, address: SS58String): Promise<boolean> {
  try {
    const entries = await api.query.multisig?.multisigs?.entries(address)
    return entries && entries.length > 0
  } catch {
    return false
  }
}
