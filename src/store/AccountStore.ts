import { SS58String } from "polkadot-api";
import { proxy } from "valtio";

export interface AccountBalance {
  free: bigint;
  reserved: bigint;
  frozen: bigint;
  flags: bigint;
}

export type AccountData = {
  name: string;
  address: SS58String; // Original address from wallet
  encodedAddress: SS58String; // Network-specific SS58 encoded address
  publicKey?: string; // Hex-encoded public key for cross-network identification
  disabled: boolean;
}

export type Account = AccountData

export const accountStore = proxy<Account>({
  name: "",
  address: "" as SS58String,
  encodedAddress: "" as SS58String,
  publicKey: undefined,
  disabled: false,
})