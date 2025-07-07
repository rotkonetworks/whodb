"use client"

import { useUrlParams } from "@/hooks/useUrlParams"
import { CHAIN_CONFIG } from "@/polkadot-api/chain-config"
import type React from "react"

import { createContext, useContext, useState, useEffect } from "react"

export type Network = "paseo" | "polkadot" | "kusama"

interface NetworkContextType {
  network: Network
  setNetwork: (network: Network) => void
  networkColor: string
  networkDisplayName: string
  isEncrypted: boolean // True if data is signed/encrypted for privacy
  isFree: boolean
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined)

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const { urlParams, setParam } = useUrlParams()
  const [_network, _setNetwork] = useState<Network | undefined>(urlParams.network as Network | undefined)

  const setNetwork = (newNetwork: Network | undefined) => {
    setParam("network", newNetwork)
    _setNetwork(newNetwork)
  }
  const networks = CHAIN_CONFIG.chains

  useEffect(() => {
    const urlNetwork = urlParams.network as Network | undefined
    if (urlNetwork && Object.keys(networks).includes(urlNetwork)) {
      setNetwork(urlNetwork)
    } else {
      // TODO Maybe a toast notification here to notify the user?
      setNetwork(undefined)
    }
  }, [urlParams.network])


  const networkColor = networks?.primaryColor
  const networkDisplayName = networks.name
  // TODO Remove, maybe display if it's testnet, or if it has test tokens
  const isEncrypted = true
  const isFree = networks.features?.includes("Free Tokens") || false

  return (
    <NetworkContext.Provider value={{ network: _network, setNetwork, networkColor, networkDisplayName, isEncrypted, isFree }}>
      {children}
    </NetworkContext.Provider>
  )
}

export function useNetwork() {
  const context = useContext(NetworkContext)
  if (context === undefined) {
    throw new Error("useNetwork must be used within a NetworkProvider")
  }
  return context
}
