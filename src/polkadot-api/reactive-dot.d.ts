import type { CHAIN_CONFIG } from "./chain-config.js";

declare module "@reactive-dot/core" {
  export interface Register {
    config: typeof CHAIN_CONFIG;
  }
}