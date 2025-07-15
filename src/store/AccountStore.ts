import { PolkadotSigner, SS58String } from "polkadot-api";
import { proxy } from "valtio";

export interface AccountBalance {
  free: bigint;
  reserved: bigint;
  frozen: bigint;
  flags: bigint;
}
export type AccountData = {
  name: string;
  address: SS58String;
  encodedAddress: SS58String;
  polkadotSigner: PolkadotSigner;
  disabled: boolean;
}
export type Account = AccountData

export const accountStore = proxy<Account>({  })
