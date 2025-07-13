import { Dialog } from "@radix-ui/react-dialog";
import BigNumber from "bignumber.js";
import { SS58String } from "polkadot-api";

import { ApiConfig } from "@/api/config";
import { AccountData } from "@/store/AccountStore";
import { XcmParameters } from "@/store/XcmParameters";
import { FormatAmountFn, SignSubmitAndWatchParams, TxStateUpdate } from "@/types";
import { ApiTx } from "@/types/api";

import { Button } from "../ui/button";
import { DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";

import Teleporter from "./Teleporter";

export const TeleporterDialog = ({
  address,
  accounts,
  chainId,
  config,
  tokenSymbol,
  tokenDecimals,
  xcmParams,
  tx,
  otherChains,
  fromBalance,
  toBalance,

  isTxBusy,
  formatAmount,
  getTeleportCall,
  signSubmitAndWatch,
  
  open,
  setOpen,
}: {
  address: SS58String;
  accounts: AccountData[];
  chainId: string | number | symbol;
  config: ApiConfig;
  tokenSymbol: string;
  tokenDecimals: number;
  xcmParams: XcmParameters;
  tx: ApiTx;
  otherChains: { id: string; name: string }[];
  fromBalance: BigNumber;
  toBalance: BigNumber;
  
  isTxBusy: boolean;
  formatAmount: FormatAmountFn;
  getTeleportCall: (params: {
    amount: BigNumber,
    // TODO: Properly pass parachainId
  }) => ApiTx;
  signSubmitAndWatch: (
    params: Pick<SignSubmitAndWatchParams, "call" | "name" | "awaitFinalization">
  ) => Promise<TxStateUpdate>;
  
  open: boolean;
  setOpen: (open: boolean) => void;
}) => {
  const teleportAmount = xcmParams.txTotalCost
  const setTeleportAmount = (amount: BigNumber) => {
    xcmParams.txTotalCost = amount
  }

  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogContent className="dark:bg-gray-900/50 bg-grey-100/50 backdrop-blur-sm">
      <DialogHeader>
        <DialogTitle>Teleport</DialogTitle>
      </DialogHeader>
      <div className="overflow-y-auto max-h-[80vh]">
        <Teleporter
          address={address}
          accounts={accounts}
          chainId={chainId}
          config={config}
          tokenSymbol={tokenSymbol}
          tokenDecimals={tokenDecimals}
          xcmParams={xcmParams}
          tx={tx}
          otherChains={otherChains}
          fromBalance={fromBalance}
          toBalance={toBalance}
          teleportAmount={teleportAmount}
          setTeleportAmount={setTeleportAmount}
          formatAmount={formatAmount}
        />
      </div>
      <DialogFooter>
        <Button
          variant="secondary"
          onClick={() => setOpen(false)}
        >
          Cancel
        </Button>
        <Button
          variant="default"
          disabled={teleportAmount.isZero() || isTxBusy}
          onClick={async () => {
            try {
              await signSubmitAndWatch({
                call: getTeleportCall({
                  amount: teleportAmount,
                  //parachainId: xcmParams.fromChain.paraId,
                }),
                name: "Teleport",
                awaitFinalization: true,
              })
              setOpen(false)
            } catch (error) {
              console.error("Teleport error", error)
            }
          }}
        >
          Confirm
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
}
