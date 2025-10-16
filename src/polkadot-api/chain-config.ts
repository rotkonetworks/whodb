import { ApiPromise, WsProvider } from '@polkadot/api';

// Chain configuration type
export type ChainConfig = {
  name: string;
  symbol: string;
  ss58Format: number;
  decimals?: number;
  paraId?: number;
  registrarIndex?: number;
  endpoint: string; // Endpoint URL for the chain
  // UI properties
  description?: string;
  iconStyle?: string;
  primaryColor?: string;
  badge?: string;
  badgeColor?: string;
  features?: string[];
};

// Chain configurations
export const CHAINS = {
  polkadot: {
    name: "Polkadot",
    symbol: "DOT",
    ss58Format: 0,
    decimals: 10,
    endpoint: import.meta.env.VITE_APP_POLKADOT_WS_URL,
  },
  polkadot_people: {
    paraId: 1004,
    name: "Polkadot People",
    symbol: "DOT",
    ss58Format: 0,
    decimals: 10,
    registrarIndex: import.meta.env.VITE_APP_REGISTRAR_INDEX__PEOPLE_POLKADOT,
    endpoint: import.meta.env.VITE_APP_POLKADOT_PEOPLE_WS_URL,
    // UI properties
    description: "A community-driven network for people.",
    iconStyle: "border-pink-500/70 hover:bg-pink-500/10",
    primaryColor: "text-pink-500",
    badge: "Community",
    badgeColor: "bg-pink-500/20 text-pink-400",
    features: ["Community-driven", "People-focused", "Experimental Features"],
  },
  ksmcc3: {
    name: "Kusama",
    symbol: "KSM",
    ss58Format: 2,
    decimals: 12,
    endpoint: import.meta.env.VITE_APP_KUSAMA_WS_URL,
  },
  ksmcc3_people: {
    paraId: 1004,
    name: "Kusama People",
    symbol: "KSM",
    ss58Format: 2,
    decimals: 12,
    registrarIndex: import.meta.env.VITE_APP_REGISTRAR_INDEX__PEOPLE_KUSAMA,
    endpoint: import.meta.env.VITE_APP_KUSAMA_PEOPLE_WS_URL,
    description: "A privacy-focused network for radical innovation.",
    iconStyle: "border-cyan-500/70 hover:bg-cyan-500/10",
    primaryColor: "text-cyan-500",
    badge: "Experimental",
    badgeColor: "bg-cyan-500/20 text-cyan-400",
    features: ["Privacy-focused", "Fast Iteration", "Experimental Features"],
  },
  paseo: {
    name: "Paseo",
    symbol: "PAS",
    ss58Format: 0,
    decimals: 12,
    endpoint: import.meta.env.VITE_APP_PASEO_WS_URL,
  },
  paseo_people: {
    paraId: 1004,
    registrarIndex: import.meta.env.VITE_APP_REGISTRAR_INDEX__PEOPLE_PASEO,
    endpoint: import.meta.env.VITE_APP_PASEO_PEOPLE_WS_URL,
    name: "Paseo People",
    symbol: "PAS",
    ss58Format: 0,
    decimals: 12,
    description: "Testnet for development, free tokens available.",
    iconStyle: "border-pink-500/70 hover:bg-pink-500/10",
    primaryColor: "text-pink-500",
    badge: "Testnet",
    badgeColor: "bg-pink-500/20 text-pink-400",
    features: ["Free Tokens", "Fast Transactions"],
  },
} as const satisfies Record<string, ChainConfig>;

export const targetChains = import.meta.env.VITE_APP_AVAILABLE_CHAINS
  ? import.meta.env.VITE_APP_AVAILABLE_CHAINS.split(',').map((key: string) => key.trim())
  : ["polkadot_people", "ksmcc3_people"];

// Connection cache to prevent multiple connections to the same endpoint
const connectionCache = new Map<string, { provider: WsProvider; api: ApiPromise }>();

// Clean up function for connections
export async function cleanupConnection(chainId: keyof typeof CHAINS) {
  const connection = connectionCache.get(chainId);
  if (connection) {
    try {
      await connection.api.disconnect();
      await connection.provider.disconnect();
    } catch (e) {
      console.warn(`Error cleaning up connection for ${chainId}:`, e);
    }
    connectionCache.delete(chainId);
  }
}

// Clean up all connections
export async function cleanupAllConnections() {
  const cleanupPromises = Array.from(connectionCache.keys()).map(chainId => 
    cleanupConnection(chainId as keyof typeof CHAINS)
  );
  await Promise.all(cleanupPromises);
}

// Client creation helper
export function createChainClient(chainId: keyof typeof CHAINS) {
  // Check if we already have a cached connection
  const cachedConnection = connectionCache.get(chainId);
  if (cachedConnection) {
    return cachedConnection.provider;
  }

  const config = CHAINS[chainId];
  console.log('Creating WebSocket connection for:', chainId, 'to endpoint:', config.endpoint);
  
  if (!config.endpoint) {
    throw new Error(`No endpoint configured for chain ${chainId}. Check environment variables.`);
  }
  
  const provider = new WsProvider(config.endpoint);
  
  // Store in cache (will be completed when getTypedApi is called)
  return provider;
}

// Typed API helper - this creates a new ApiPromise which should be cleaned up properly
export async function getTypedApi(chainId: keyof typeof CHAINS, provider?: WsProvider) {
  // Check if we already have a cached connection
  const cachedConnection = connectionCache.get(chainId);
  if (cachedConnection) {
    return cachedConnection.api;
  }

  const client = provider || createChainClient(chainId);
  
  const api = await ApiPromise.create({
    provider: client,
  });
  await api.isReady;

  // Cache the connection
  connectionCache.set(chainId, { provider: client, api });

  return api;
}
