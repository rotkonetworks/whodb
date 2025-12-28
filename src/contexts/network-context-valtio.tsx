/**
 * Valtio-powered Network Context
 * Ryan Carniato style - fine-grained reactive updates
 * Components only re-render when the specific properties they use change
 */

import { useEffect, type ReactNode } from "react";
import { useSnapshot } from "valtio";
import { useUrlParams } from "@/hooks/useUrlParams";
import {
  networkStore,
  setNetwork,
  initializeNetworkFromUrl,
  type Network,
} from "@/store/NetworkStore";

export function NetworkProviderValtio({ children }: { children: ReactNode }) {
  const { urlParams, setParam, deleteParam } = useUrlParams();

  useEffect(() => {
    // Initialize network from URL on mount
    const urlNetwork = urlParams.network as Network | undefined;
    initializeNetworkFromUrl(urlNetwork);
  }, [urlParams.network]);

  // Sync URL params when network changes in store
  useEffect(() => {
    const currentNetwork = networkStore.network;
    if (currentNetwork) {
      setParam("network", currentNetwork);
    } else {
      deleteParam("network");
    }
  }, [networkStore.network, setParam, deleteParam]);

  // No context provider needed - Valtio is global reactive state
  return <>{children}</>;
}

/**
 * Hook to access network store with fine-grained reactivity
 * Only re-renders when the properties you actually use change
 *
 * Example:
 * ```tsx
 * const { network, networkColor } = useNetworkValtio();
 * // Component only re-renders when network or networkColor change
 * // NOT when other properties like ss58Format change
 * ```
 */
export function useNetworkValtio() {
  const snap = useSnapshot(networkStore);

  return {
    ...snap,
    setNetwork, // Action to update network
  };
}

/**
 * Selector hook for accessing only specific network properties
 * Even more fine-grained than useNetworkValtio
 *
 * Example:
 * ```tsx
 * const networkColor = useNetworkSelector(s => s.networkColor);
 * // Component ONLY re-renders when networkColor changes
 * ```
 */
export function useNetworkSelector<T>(selector: (state: typeof networkStore) => T): T {
  const snap = useSnapshot(networkStore);
  return selector(snap);
}
