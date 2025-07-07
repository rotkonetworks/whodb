import {
  polkadot,
  polkadot_people,
  ksmcc3,
  ksmcc3_people,
  paseo,
  paseo_people,
} from "@polkadot-api/descriptors";
import { getWsProvider } from "@polkadot-api/ws-provider/web";
import { defineConfig, type ChainConfig as ReactiveDotChainConfig, type Config } from "@reactive-dot/core";
import { InjectedWalletProvider } from "@reactive-dot/core/wallets.js";
import { LedgerWallet } from "@reactive-dot/wallet-ledger";
import { WalletConnect } from "@reactive-dot/wallet-walletconnect";
import { registerDotConnect } from "dot-connect";
import { withPolkadotSdkCompat } from "polkadot-api/polkadot-sdk-compat";

// TODO Have additional WebSocket endpoint for each chain

export type ChainConfig = Config & {
  chains: Record<
    string,
    ReactiveDotChainConfig & {
      name: string;
      symbol: string;
      registrarIndex?: number;
      // UI extra properties
      description?: string;
      iconStyle?: string;
      primaryColor?: string;
      badge?: string;
      badgeColor?: string;
      features?: string[];
    }
  >;
};

export const CHAIN_CONFIG = defineConfig({
  chains: {
    polkadot: {
      name: "Polkadot",
      symbol: "DOT",
      descriptor: polkadot,
      provider: withPolkadotSdkCompat(getWsProvider(import.meta.env.VITE_APP_POLKADOT_WS_URL)),
    },
    polkadot_people: {
      name: "Polkadot People",
      symbol: "DOT",
      descriptor: polkadot_people,
      provider: withPolkadotSdkCompat(getWsProvider(import.meta.env.VITE_APP_POLKADOT_PEOPLE_WS_URL)),
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
      provider: withPolkadotSdkCompat(getWsProvider(import.meta.env.VITE_APP_KUSAMA_WS_URL)),
    },
    ksmcc3_people: {
      name: "Kusama People",
      symbol: "KSM",
      descriptor: ksmcc3_people,
      provider: withPolkadotSdkCompat(getWsProvider(import.meta.env.VITE_APP_KUSAMA_PEOPLE_WS_URL)),
      registrarIndex: import.meta.env.VITE_APP_REGISTRAR_INDEX__PEOPLE_KUSAMA,
      // UI properties
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
      provider: withPolkadotSdkCompat(getWsProvider(import.meta.env.VITE_APP_PASEO_WS_URL)),
    },
    paseo_people: {
      descriptor: paseo_people,
      provider: withPolkadotSdkCompat(getWsProvider(import.meta.env.VITE_APP_PASEO_PEOPLE_WS_URL)),
      registrarIndex: import.meta.env.VITE_APP_REGISTRAR_INDEX__PEOPLE_PASEO,
      // UI properties
      name: "Paseo People",
      symbol: "PAS",
      description: "Testnet for development, free tokens available.",
      iconStyle: "border-pink-500/70 hover:bg-pink-500/10",
      primaryColor: "text-pink-500",
      badge: "Testnet",
      badgeColor: "bg-pink-500/20 text-pink-400",
      features: ["Free Tokens", "Fast Transactions"],
    },
  },
  targetChains: import.meta.env.VITE_APP_AVAILABLE_CHAINS
    ? import.meta.env.VITE_APP_AVAILABLE_CHAINS.split(',').map((key: string) => key.trim())
    : ["polkadot_people", "ksmcc3_people",]
  ,
  wallets: [
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
  ],
} as const satisfies ChainConfig);

// Register dot-connect custom elements & configure supported wallets
registerDotConnect({
  wallets: CHAIN_CONFIG.wallets,
});
