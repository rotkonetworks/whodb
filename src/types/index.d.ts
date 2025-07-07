import { ChainDescriptorOf, Chains } from "@reactive-dot/core/internal.js";
import BigNumber from "bignumber.js";
import { PolkadotSigner, TypedApi } from "polkadot-api"
import { Ref } from "react";

import { AccountTreeNode } from "~/hooks/UseAccountsTree";
import { AlertPropsOptionalKey } from "~/hooks/useAlerts";
import { VerifyPGPKey } from "~/hooks/useChallengeWebSocket";
import { AccountData } from "~/store/AccountStore";
import { ChainInfo } from "~/store/ChainStore";
import { ChallengeStore } from "~/store/challengesStore";

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
}
export type OpenTxDialogArgs = OpenTxDialogArgs_modeSet | { mode: null }

export type IdentityFormRef = { reset: () => void; };

export type MainContentProps = {
  identity: Identity,
  challengeStore: { challenges: ChallengeStore, error: string | null, loading: boolean },
  chainStore: ChainInfo,
  typedApi: TypedApi<ChainDescriptorOf<keyof Chains>>,
  accountStore: AccountData,
  chainConstants,
  addNotification: (alertProps: AlertPropsOptionalKey) => void,
  formatAmount: FormatAmountFn,
  supportedFields: string[],
  identityFormRef: Ref<IdentityFormRef>,
  urlParams: Record<string, string>,
  updateUrlParams: (urlParams: UrlParamsArgs) => void,
  setOpenDialog: (mode: DialogMode) => void,
  isTxBusy: boolean,
  accountTreeProps: {
    tree: AccountTreeNode | null
    loading: boolean,
  },
  openTxDialog: (params: OpenTxDialogArgs) => void,
  sendPGPVerification: (payload: VerifyPGPKey) => Promise<void>
}

export type SignSubmitAndWatchParams = {
  call: ApiTx;
  name: string;
  api?: TypedApi<ChainDescriptorOf<keyof Chains>>;
  awaitFinalization?: boolean;
  nonce?: number;
  signer?: PolkadotSigner;
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
