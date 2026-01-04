import { ApiPromise, WsProvider } from '@polkadot/api';

// Chain configuration type
export type ChainConfig = {
  name: string;
  symbol: string;
  ss58Format: number;
  decimals?: number;
  paraId?: number;
  registrarIndex?: number;
  maxRegistrarFee?: number; // Maximum fee to pay for registrar judgement (in planck)
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
  polkadot_assethub: {
    paraId: 1000,
    name: "Polkadot Asset Hub",
    symbol: "DOT",
    ss58Format: 0,
    decimals: 10,
    endpoint: import.meta.env.VITE_APP_POLKADOT_ASSETHUB_WS_URL || "wss://polkadot-asset-hub-rpc.polkadot.io",
    description: "Asset management parachain.",
    iconStyle: "border-blue-500/70 hover:bg-blue-500/10",
    primaryColor: "text-blue-500",
    badge: "Assets",
    badgeColor: "bg-blue-500/20 text-blue-400",
    features: ["Asset Management", "NFTs", "Transfers"],
  },
  polkadot_hydration: {
    paraId: 2034,
    name: "Polkadot Hydration",
    symbol: "DOT",
    ss58Format: 0,
    decimals: 10,
    endpoint: import.meta.env.VITE_APP_POLKADOT_HYDRATION_WS_URL || "wss://hydration.dotters.network",
    description: "DeFi hub with liquidity pools and DEX.",
    iconStyle: "border-blue-400/70 hover:bg-blue-400/10",
    primaryColor: "text-blue-400",
    badge: "DeFi",
    badgeColor: "bg-blue-400/20 text-blue-300",
    features: ["Liquidity Pools", "DEX", "Trading"],
  },
  polkadot_people: {
    paraId: 1004,
    name: "Polkadot People",
    symbol: "DOT",
    ss58Format: 0,
    decimals: 10,
    registrarIndex: Number(import.meta.env.VITE_APP_REGISTRAR_INDEX__PEOPLE_POLKADOT),
    maxRegistrarFee: Number(import.meta.env.VITE_APP_REGISTRAR_MAX_FEE__PEOPLE_POLKADOT),
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
  ksmcc3_assethub: {
    paraId: 1000,
    name: "Kusama Asset Hub",
    symbol: "KSM",
    ss58Format: 2,
    decimals: 12,
    endpoint: import.meta.env.VITE_APP_KUSAMA_ASSETHUB_WS_URL || "wss://kusama-asset-hub-rpc.polkadot.io",
    description: "Asset management parachain.",
    iconStyle: "border-blue-500/70 hover:bg-blue-500/10",
    primaryColor: "text-blue-500",
    badge: "Assets",
    badgeColor: "bg-blue-500/20 text-blue-400",
    features: ["Asset Management", "NFTs", "Transfers"],
  },
  ksmcc3_people: {
    paraId: 1004,
    name: "Kusama People",
    symbol: "KSM",
    ss58Format: 2,
    decimals: 12,
    registrarIndex: Number(import.meta.env.VITE_APP_REGISTRAR_INDEX__PEOPLE_KUSAMA),
    maxRegistrarFee: Number(import.meta.env.VITE_APP_REGISTRAR_MAX_FEE__PEOPLE_KUSAMA),
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
    decimals: 10, // Paseo uses 10 decimals
    endpoint: import.meta.env.VITE_APP_PASEO_WS_URL,
  },
  paseo_assethub: {
    paraId: 1000,
    name: "Paseo Asset Hub",
    symbol: "PAS",
    ss58Format: 0,
    decimals: 10, // Paseo uses 10 decimals
    endpoint: import.meta.env.VITE_APP_PASEO_ASSETHUB_WS_URL || "wss://paseo-asset-hub-rpc.polkadot.io",
    description: "Asset management parachain for testnet.",
    iconStyle: "border-blue-500/70 hover:bg-blue-500/10",
    primaryColor: "text-blue-500",
    badge: "Assets",
    badgeColor: "bg-blue-500/20 text-blue-400",
    features: ["Asset Management", "NFTs", "Transfers"],
  },
  paseo_people: {
    paraId: 1004,
    registrarIndex: Number(import.meta.env.VITE_APP_REGISTRAR_INDEX__PEOPLE_PASEO) || 1, // Default to registrar #1
    maxRegistrarFee: Number(import.meta.env.VITE_APP_REGISTRAR_MAX_FEE__PEOPLE_PASEO),
    endpoint: import.meta.env.VITE_APP_PASEO_PEOPLE_WS_URL,
    name: "Paseo People",
    symbol: "PAS",
    ss58Format: 0,
    decimals: 10, // Paseo uses 10 decimals
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

/**
 * Get network priority for sorting (lower = higher priority)
 * Polkadot networks first, then Kusama, then others
 * Handles both frontend chain IDs (ksmcc3_people) and backend network names (kusama)
 */
export function getNetworkPriority(network?: string): number {
  if (!network) return 999;
  const n = network.toLowerCase();
  if (n.startsWith('polkadot')) return 0;
  if (n.startsWith('ksmcc3') || n === 'kusama') return 1;
  if (n.startsWith('paseo')) return 2;
  return 3;
}

/**
 * Sort profiles by network priority
 */
export function sortByNetworkPriority<T extends { network?: string }>(profiles: T[]): T[] {
  return profiles.sort((a, b) => {
    return getNetworkPriority(a.network) - getNetworkPriority(b.network);
  });
}

/**
 * Map parachain to its relay chain ecosystem for URL routing
 * Handles both frontend chain IDs (ksmcc3_people) and backend network names (kusama)
 */
export function getEcosystemName(chainId: string): string {
  const id = chainId.toLowerCase();
  if (id.startsWith('polkadot')) return 'polkadot';
  if (id.startsWith('ksmcc3') || id === 'kusama') return 'kusama';
  if (id.startsWith('paseo')) return 'paseo';
  return chainId;
}

/**
 * Get the people chain for a given ecosystem
 */
export function getPeopleChain(ecosystem: string): keyof typeof CHAINS | null {
  switch (ecosystem) {
    case 'polkadot':
      return 'polkadot_people';
    case 'kusama':
      return 'ksmcc3_people';
    case 'paseo':
      return 'paseo_people';
    default:
      return null;
  }
}

/**
 * Map backend network names to CHAINS keys
 * Backend stores: "kusama", "polkadot", "paseo"
 * Frontend uses: "ksmcc3_people", "polkadot_people", "paseo_people"
 */
export function getChainKeyFromNetwork(network: string): keyof typeof CHAINS | null {
  switch (network.toLowerCase()) {
    case 'polkadot':
      return 'polkadot_people';
    case 'kusama':
      return 'ksmcc3_people';
    case 'paseo':
      return 'paseo_people';
    default:
      // Try direct lookup
      if (network in CHAINS) {
        return network as keyof typeof CHAINS;
      }
      return null;
  }
}
