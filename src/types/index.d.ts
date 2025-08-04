import BigNumber from "bignumber.js";
import { TypedApi } from "polkadot-api";
import { Ref } from "react";
import { Signer } from "@polkadot/api/types";

import { AccountTreeNode } from "~/hooks/UseAccountsTree";
import { AlertPropsOptionalKey } from "~/hooks/useAlerts";
import { VerifyPGPKey } from "~/hooks/useChallengeWebSocket";
import { AccountData } from "~/store/AccountStore";
import { ChainInfo } from "~/store/ChainStore";
import { ChallengeStore } from "~/store/challengesStore";

import { ApiPromise } from "@polkadot/api";
import { Identity } from "./Identity";
import { ApiTx } from "./api";

export type DialogMode = 
  "connectWallets" |
  "clearIdentity" |
  "disconnect" |
  "teleport" |
  "help" |
  "requestJudgement" |
  "setIdentity" |
  "addSubaccount" |
  "editSubAccount" |
  "removeSubaccount" |
  "quitSub" |
  "errorDetails" |
  null;

export type EstimatedCostInfo = {
  fees?: bigint | BigNumber
  deposits?: bigint | BigNumber
}

export type OpenTxDialogArgs_modeSet = {
  mode: DialogMode
  tx: ApiTx
  estimatedCosts: EstimatedCostInfo
  name?: string
}
export type OpenTxDialogArgs = OpenTxDialogArgs_modeSet | { mode: null }

export type IdentityFormRef = { reset: () => void; };

export type SignSubmitAndWatchParams = {
  call: ApiTx;
  name: string;
  api?: ApiPromise;
  awaitFinalization?: boolean;
  nonce?: number;
  signer?: Signer;
};

export type FormatAmountOptions = {
  decimals?: number,
  symbol: string,
  tokenDecimals?: number,
}
export type AssetAmount = number | bigint | BigNumber | string

export type FormatAmountFn = (
  amount: AssetAmount,
  options?: FormatAmountOptions,
) => string

export type TxStateUpdate = {
  type: "broadcasted" | "txBestBlocksState" | "finalized" | "signed";
  txHash: HexString;
  found?: boolean;
  ok?: boolean;
  isValid?: boolean;
};
