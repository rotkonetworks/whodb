import { useUrlParams } from "@/hooks/useUrlParams"
import { CHAINS } from "@/polkadot-api/chain-config"
import type React from "react"
import type { ChainInfo } from "@/store/ChainStore"
import { toast } from "sonner"

import { createContext, useContext, useState, useEffect, Key, useCallback } from "react"

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
  const networks = CHAINS

  const setNetwork = useCallback((newNetwork: Network | undefined) => {
    if (!newNetwork) {
      deleteParam("network")
      return
    }

    // Validate network exists
    if (!Object.keys(networks).includes(newNetwork)) {
      toast.error(`Network ${newNetwork} is not supported`)
      return
    }

    // Check if switching from a different network
    if (_network && _network !== newNetwork) {
      const fromNetwork = networks[_network]?.name || _network
      const toNetwork = networks[newNetwork]?.name || newNetwork
      toast.info(`Switching from ${fromNetwork} to ${toNetwork}...`)
    }

    setParam("network", newNetwork)
    _setNetwork(newNetwork)
  }, [_network, deleteParam, setParam, networks])

  useEffect(() => {
    const urlNetwork = urlParams.network as Network | undefined
    if (urlNetwork) {
      if (Object.keys(networks).includes(urlNetwork)) {
        if (_network !== urlNetwork) {
          _setNetwork(urlNetwork)
        }
      } else {
        toast.error(`Network ${urlNetwork} from URL is not supported`)
        setNetwork(undefined)
      }
    }
  }, [urlParams.network, _network, networks])


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
