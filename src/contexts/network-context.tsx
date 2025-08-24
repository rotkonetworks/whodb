import { useUrlParams } from "@/hooks/useUrlParams"
import { CHAINS } from "@/polkadot-api/chain-config"
import type React from "react"
import type { ChainInfo } from "@/store/ChainStore"

import { createContext, useContext, useState, useEffect, Key } from "react"

export type Network = keyof typeof CHAINS

interface NetworkContextType extends ChainInfo {
  network: Network
  setNetwork: (network: Network) => void
  networkColor: string
  networkDisplayName: string
  isEncrypted: boolean // True if data is signed/encrypted for privacy
  isFree: boolean
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined)

export function NetworkProvider({ children }: { children: React.ReactNode, network?: Network }) {
  const { urlParams, setParam, deleteParam } = useUrlParams()
  const [_network, _setNetwork] = useState<Network | undefined>(urlParams.network as Network | undefined)

  const setNetwork = (newNetwork: Network | undefined) => {
    if (!newNetwork) {
      deleteParam("network")
    }
    setParam("network", newNetwork)
    _setNetwork(newNetwork)
  }
  const networks = CHAINS

  useEffect(() => {
    const urlNetwork = urlParams.network as Network | undefined
    if (urlNetwork && Object.keys(networks).includes(urlNetwork)) {
      setNetwork(urlNetwork)
    } else {
      // TODO Maybe a toast notification here to notify the user?
      setNetwork(undefined)
    }
  }, [urlParams.network])


  const networkColor = networks[_network]?.primaryColor || "#000000" // Default to black if not defined
  const networkDisplayName = networks[_network]?.name.replace(" People", "") || networks[_network]?.name
  // TODO Remove, maybe display if it's testnet, or if it has test tokens
  const isEncrypted = networks[_network]?.isEncrypted || false
  const isFree = networks[_network]?.isFree || false // True if it's a testnet or has free tokens

  const relayId = _network?.split("_")[0] || "";
  const relay = _network ? {
    id: relayId,
    name: networks[relayId]?.name || "",
    parachains: Object.keys(networks)
      .filter(key => key.startsWith(relayId))
      .map(key => ({
        id: key,
        name: networks[key]?.name || "",
      }))
    ,
  } : null;

  return (
    <NetworkContext.Provider value={{ 
      network: _network, setNetwork, networkColor, networkDisplayName, isEncrypted, isFree,
      id: networks[_network]?.id,
      name: networks[_network]?.name || "",
      ss58Format: networks[_network]?.ss58Format,
      tokenDecimals: networks[_network]?.tokenDecimals,
      tokenSymbol: networks[_network]?.tokenSymbol,
      registrarIndex: networks[_network]?.registrarIndex,
      relay,
    }}>
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
