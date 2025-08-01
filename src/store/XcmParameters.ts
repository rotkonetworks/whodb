import { Network } from "@/contexts/network-context";
import BigNumber from "bignumber.js";
import { SS58String } from "polkadot-api";
import { proxy } from "valtio";

import { EstimatedCostInfo } from "@/types";

export type XcmParameters = {
  enabled: boolean;
  fromAddress: SS58String;
  fromChain: {
    name: string;
    id: Network;
    paraId?: number;
  };
  txCosts: EstimatedCostInfo;
  txTotalCost: BigNumber;
};

export const xcmParameters = proxy<XcmParameters>({
  enabled: false,
  fromAddress: "",
  fromChain: {
    name: "",
    id: import.meta.env.VITE_DEFAULT_CHAIN as Network,
    paraId: undefined,
  },
  txCosts: {},
  txTotalCost: BigNumber(0),
})
