import {
  ksmcc3,
  ksmcc3_people,
  paseo,
  paseo_people,
  polkadot,
  polkadot_people,
} from "@polkadot-api/descriptors";
import { InjectedWalletProvider } from "@reactive-dot/core/wallets.js";
import { LedgerWallet } from "@reactive-dot/wallet-ledger";
import { WalletConnect } from "@reactive-dot/wallet-walletconnect";
import { registerDotConnect } from "dot-connect";
import { createClient } from "polkadot-api";

// Chain configuration type
export type ChainConfig = {
  name: string;
  symbol: string;
  descriptor: any;
  paraId?: number;
  registrarIndex?: number;
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
    descriptor: polkadot,
  },
  polkadot_people: {
    paraId: 1004,
    name: "Polkadot People",
    symbol: "DOT",
    descriptor: polkadot_people,
    registrarIndex: import.meta.env.VITE_APP_REGISTRAR_INDEX__PEOPLE_POLKADOT,
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
    descriptor: ksmcc3,
  },
  ksmcc3_people: {
    paraId: 1004,
    name: "Kusama People",
    symbol: "KSM",
    descriptor: ksmcc3_people,
    registrarIndex: import.meta.env.VITE_APP_REGISTRAR_INDEX__PEOPLE_KUSAMA,
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
    descriptor: paseo,
  },
  paseo_people: {
    paraId: 1004,
    descriptor: paseo_people,
    registrarIndex: import.meta.env.VITE_APP_REGISTRAR_INDEX__PEOPLE_PASEO,
    name: "Paseo People",
    symbol: "PAS",
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

// Wallet configuration
export const wallets = [
  new InjectedWalletProvider(),
  new LedgerWallet(),
  new WalletConnect({
    projectId: import.meta.env.VITE_APP_WALLET_CONNECT_PROJECT_ID,
    providerOptions: {
      metadata: {
        name: "w3reg",
        description: "web3 registrar.",
        url: globalThis.origin,
        icons: ["/logo.png"],
      },
    },
    chainIds: [
      "polkadot:67fa177a097bfa18f77ea95ab56e9bcd", // people-polkadot
      "polkadot:c1af4cb4eb3918e5db15086c0cc5ec17", // people-ksmcc3
    ],
    optionalChainIds: [
      "polkadot:91b171bb158e2d3848fa23a9f1c25182", // polkadot
      "polkadot:b0a8d493285c2df73290dfb7e61f870f", // ksmcc3
    ],
  }),
];

// Register dot-connect
registerDotConnect({ wallets });

// Client creation helper
export function createChainClient(chainId: keyof typeof CHAINS) {
  const config = CHAINS[chainId];
  const provider = config.provider();
  return createClient(provider);
}

// Typed API helper
export function getTypedApi(chainId: keyof typeof CHAINS) {
  const client = createChainClient(chainId);
  const config = CHAINS[chainId];
  return client.getTypedApi(config.descriptor);
}
