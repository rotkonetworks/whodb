import { useState, useEffect, useCallback } from "react"
import { SS58String } from "polkadot-api"

export interface SuperOfResult {
  address: SS58String
  name?: string
}

export interface SubsOfResult {
  deposit: bigint
  subs: Array<{ address: SS58String; name?: string }>
}

export function useSuperOf(address: SS58String | undefined, chainId: string | null) {
  const [superOf, setSuperOf] = useState<SuperOfResult | null>(null)
  const [subsOf, setSubsOf] = useState<SubsOfResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchRelations = useCallback(async () => {
    if (!address || !chainId) {
      setSuperOf(null)
      setSubsOf(null)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const { getPapiClient } = await import("@/lib/papi-client")
      const descriptors = await import("@polkadot-api/descriptors")

      const client = await getPapiClient(chainId, false)
      const descriptor = descriptors[chainId as keyof typeof descriptors]

      if (!descriptor) {
        throw new Error(`No descriptor for chain: ${chainId}`)
      }

      const typedApi = client.getTypedApi(descriptor)

      // Fetch superOf (parent account)
      try {
        const superOfData = await typedApi.query.Identity.SuperOf.getValue(address)
        if (superOfData) {
          const [parentAddress, nameData] = superOfData
          let name: string | undefined
          if (nameData && nameData.type !== "None" && nameData.value) {
            name = nameData.value.asText?.() || undefined
          }
          setSuperOf({ address: parentAddress, name })
        } else {
          setSuperOf(null)
        }
      } catch {
        setSuperOf(null)
      }

      // Fetch subsOf (sub accounts)
      try {
        const subsOfData = await typedApi.query.Identity.SubsOf.getValue(address)
        if (subsOfData && subsOfData[1] && subsOfData[1].length > 0) {
          const [deposit, subAddresses] = subsOfData

          // Fetch names for each sub account
          const subsWithNames = await Promise.all(
            subAddresses.map(async (subAddress: SS58String) => {
              try {
                const subSuperOf = await typedApi.query.Identity.SuperOf.getValue(subAddress)
                if (subSuperOf) {
                  const [, nameData] = subSuperOf
                  let name: string | undefined
                  if (nameData && nameData.type !== "None" && nameData.value) {
                    name = nameData.value.asText?.() || undefined
                  }
                  return { address: subAddress, name }
                }
              } catch {}
              return { address: subAddress }
            })
          )

          setSubsOf({ deposit, subs: subsWithNames })
        } else {
          setSubsOf(null)
        }
      } catch {
        setSubsOf(null)
      }
    } catch (err) {
      console.error("Error fetching account relations:", err)
      setError(err instanceof Error ? err.message : "Failed to fetch relations")
    } finally {
      setIsLoading(false)
    }
  }, [address, chainId])

  useEffect(() => {
    fetchRelations()
  }, [fetchRelations])

  return {
    superOf,
    subsOf,
    isLoading,
    error,
    refetch: fetchRelations,
  }
}
