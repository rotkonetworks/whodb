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
  address: SS58String;
  encodedAddress: SS58String;
  disabled: boolean;
}

export const accountStore = proxy<AccountData>({
  name: "",
  address: "" as SS58String,
  encodedAddress: "" as SS58String,
  disabled: false,
})
