import { proxy } from "valtio";
import { CHAINS } from "@/polkadot-api/chain-config";

export type Network = keyof typeof CHAINS;

export interface NetworkState {
  network: Network | undefined;
  networkColor: string;
  networkDisplayName: string;
  isEncrypted: boolean;
  isFree: boolean;
  id: string;
  name: string;
  ss58Format: number | undefined;
  tokenDecimals: number | undefined;
  tokenSymbol: string | undefined;
  registrarIndex: number | undefined;
  relay: {
    id: string;
    name: string;
    parachains: { id: string; name: string }[];
  } | null;
}

// Fine-grained reactive store - components only re-render when specific properties change
export const networkStore = proxy<NetworkState>({
  network: undefined,
  networkColor: "#000000",
  networkDisplayName: "",
  isEncrypted: false,
  isFree: false,
  id: "",
  name: "",
  ss58Format: undefined,
  tokenDecimals: undefined,
  tokenSymbol: undefined,
  registrarIndex: undefined,
  relay: null,
});

// Derived state computation - SolidJS style
const computeNetworkState = (network: Network | undefined): Partial<NetworkState> => {
  if (!network) {
    return {
      networkColor: "#000000",
      networkDisplayName: "",
      isEncrypted: false,
      isFree: false,
      id: "",
      name: "",
      ss58Format: undefined,
      tokenDecimals: undefined,
      tokenSymbol: undefined,
      registrarIndex: undefined,
      relay: null,
    };
  }

  const chain = CHAINS[network];
  const relayId = network.split("_")[0] || "";

  return {
    networkColor: chain?.primaryColor || "#000000",
    networkDisplayName: chain?.name.replace(" People", "") || chain?.name || "",
    isEncrypted: chain?.isEncrypted || false,
    isFree: chain?.isFree || false,
    id: chain?.id || "",
    name: chain?.name || "",
    ss58Format: chain?.ss58Format,
    tokenDecimals: chain?.tokenDecimals,
    tokenSymbol: chain?.tokenSymbol,
    registrarIndex: chain?.registrarIndex,
    relay: {
      id: relayId,
      name: CHAINS[relayId]?.name || "",
      parachains: Object.keys(CHAINS)
        .filter((key) => key.startsWith(relayId))
        .map((key) => ({
          id: key,
          name: CHAINS[key]?.name || "",
        })),
    },
  };
};

// Actions - similar to SolidJS patterns
export const setNetwork = (network: Network | undefined) => {
  networkStore.network = network;

  // Update derived state in single batch
  const derived = computeNetworkState(network);
  Object.assign(networkStore, derived);
};

// Initialize from URL params
export const initializeNetworkFromUrl = (urlNetwork: Network | undefined) => {
  if (urlNetwork && Object.keys(CHAINS).includes(urlNetwork)) {
    setNetwork(urlNetwork);
  } else {
    setNetwork(undefined);
  }
};
