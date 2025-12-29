import { CHAINS, getPeopleChain } from "@/polkadot-api/chain-config"
import type React from "react"
import type { ChainInfo } from "@/store/ChainStore"
import { useParams, useLocation } from "react-router-dom"

import { createContext, useContext, useMemo } from "react"

export type Network = keyof typeof CHAINS

interface NetworkContextType extends ChainInfo {
  network: Network
  networkColor: string
  networkDisplayName: string
  isEncrypted: boolean
  isFree: boolean
  isViewOnly: boolean
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined)

const DEFAULT_NETWORK: Network = (import.meta.env.VITE_APP_DEFAULT_CHAIN || 'paseo_people') as Network

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const params = useParams<{ network?: string }>();
  const location = useLocation();
  const networks = CHAINS;

  // Derive network from URL path, not from state
  const network = useMemo(() => {
    // Try to get network from route params first
    if (params.network) {
      // If already a people chain key, use it directly
      if (params.network.includes('_people') && Object.keys(networks).includes(params.network)) {
        return params.network as Network;
      }

      // Map ecosystem name to people chain (handles kusama -> ksmcc3_people)
      const peopleChain = getPeopleChain(params.network);
      if (peopleChain && Object.keys(networks).includes(peopleChain)) {
        return peopleChain as Network;
      }
    }

    // Fallback to default
    return DEFAULT_NETWORK;
  }, [params.network]);

  const networkColor = networks[network]?.primaryColor || "#000000"
  const networkDisplayName = networks[network]?.name?.replace(" People", "") || networks[network]?.name
  const isEncrypted = networks[network]?.isEncrypted || false
  const isFree = networks[network]?.isFree || false
  // View-only if no registrar index configured (NaN or undefined)
  const registrarIndex = networks[network]?.registrarIndex
  const isViewOnly = registrarIndex === undefined || isNaN(registrarIndex)

  const relayId = network?.split("_")[0] || "";
  const relay = network ? {
    id: relayId,
    name: networks[relayId]?.name || "",
    parachains: Object.keys(networks)
      .filter(key => key.startsWith(relayId))
      .map(key => ({
        id: key,
        name: networks[key]?.name || "",
      }))
  } : null;

  return (
    <NetworkContext.Provider value={{
      network,
      networkColor,
      networkDisplayName,
      isEncrypted,
      isFree,
      isViewOnly,
      id: networks[network]?.id,
      name: networks[network]?.name || "",
      ss58Format: networks[network]?.ss58Format,
      tokenDecimals: networks[network]?.tokenDecimals,
      tokenSymbol: networks[network]?.tokenSymbol,
      registrarIndex,
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
