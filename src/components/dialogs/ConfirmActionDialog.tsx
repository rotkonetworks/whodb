import BigNumber from "bignumber.js";
import { AlertCircle, Coins } from "lucide-react";

import { Button } from "@/components/ui/button";
import { AccountData } from "@/store/AccountStore";
import { ChainInfo } from "@/store/ChainStore";
import { DialogMode, EstimatedCostInfo, FormatAmountFn, OpenTxDialogArgs } from "@/types";
import { Identity } from "@/types/Identity";
import { ApiTx } from "@/types/api";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";


export default function ConfirmActionDialog({
  openDialog,
  closeTxDialog,
  openTxDialog,
  submitTransaction,
  estimatedCosts,
  txToConfirm,
  chainStore,
  accountStore,
  balance,
  minimunTeleportAmount,
  formatAmount,
  identity,
  isTxBusy,
}: {
  openDialog: DialogMode;
  closeTxDialog: () => void;
  openTxDialog: (dialog: OpenTxDialogArgs) => void;
  submitTransaction: () => void;
  estimatedCosts: EstimatedCostInfo;
  txToConfirm: ApiTx;
  chainStore: ChainInfo;
  accountStore: AccountData;
  balance: BigNumber;
  minimunTeleportAmount: BigNumber;
  formatAmount: FormatAmountFn;
  identity: Identity;
  isTxBusy: boolean;
}) {
  const relayChainId = (chainStore.id as string).split("_")[0];

  return (
    <Dialog
      open={[
        "clearIdentity", "setIdentity", "requestJudgement", "addSubaccount", "removeSubaccount",
        "quitSub", "editSubAccount"
      ].includes(openDialog)}
      onOpenChange={v => v
        ? openTxDialog({
          mode: openDialog,
          tx: txToConfirm,
          estimatedCosts,
        })
        : closeTxDialog()
      }
    >
      <DialogContent className="dark:bg-[#2C2B2B] dark:text-[#FFFFFF] border-[#E6007A]">
        <DialogHeader>
          {/* TODO Add transaction name */}
          <DialogTitle className="text-[#E6007A]">Confirm Action</DialogTitle>
          <DialogDescription>
            Please review the following information before proceeding.
          </DialogDescription>
        </DialogHeader>
        <div className="overflow-y-auto max-h-[66vh] sm:max-h-[75vh]">
          {Object.keys(estimatedCosts).length > 0 &&
            <div>
              <h4 className="text-lg font-semibold mb-2 flex items-center gap-2">
                <Coins className="h-5 w-5 text-[#E6007A]" />
                Transaction Costs
              </h4>
              <ul className="list-disc list-inside">
                {estimatedCosts.fees &&
                  <li>Total estimated cost: {formatAmount(estimatedCosts.fees)}</li>
                }
                {estimatedCosts.deposits &&
                  <li>Existential deposit: {formatAmount(estimatedCosts.deposits)}</li>
                }
                <li>Current balance: {formatAmount(balance)}</li>
              </ul>
            </div>
          }
          <div>
            <h4 className="text-lg font-semibold mt-4 mb-2 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-[#E6007A]" />
              Important Notes
            </h4>
            <ul className="list-disc list-inside">
              {openDialog === "clearIdentity" && (<>
                <li>All identity data will be deleted from chain.</li>
                <li>You will have to set identity again.</li>
                <li>You will lose verification status.</li>
                <li>Your deposit of {formatAmount(identity.deposit)} will be returned.</li>
                <li>All of your subaccounts will be dropped.</li>
              </>)}
              {openDialog === "setIdentity" && (<>
                <li>Identity data will be set on chain.</li>
                <li>
                  Deposit of {formatAmount(identity.deposit)} will be taken, which will be
                  released if you clear your identity.
                </li>
              </>)}
              {openDialog === "requestJudgement" && (<>
                <li>
                  After having fees paid, you will have to go to the second tab and complete all challenges
                  in order to be verified.
                </li>
              </>)}
              {["setIdentity", "requestJudgement"].includes(openDialog) && (<>
                <li>Your identity information will remain publicly visible on-chain to everyone until you clear it.</li>
                <li>Please ensure all provided information is accurate before continuing.</li>
              </>)}
              {openDialog === "addSubaccount" && (<>
                <li>You will link another account as a subaccount under your identity.</li>
                <li>This relationship will be publicly visible on-chain.</li>
                <li>A deposit will be required for managing subaccounts.</li>
                <li>
                  If you link an account you don&apos;t own, the actual owner can quit and take your deposit.
                </li>
              </>)}
              {openDialog === "removeSubaccount" && (<>
                <li>You will remove the link between your account and this subaccount.</li>
                <li>Your deposit for this subaccount will be returned.</li>
              </>)}
              {openDialog === "editSubAccount" && (<>
                <li>You will update the name of this subaccount.</li>
                <li>This will be publicly visible on-chain.</li>
                <li>There is no deposit required for this action.</li>
              </>)}
              {openDialog === "quitSub" && (<>
                <li>You will remove your account&apos;s status as a subaccount.</li>
                <li>This will break the link with your parent account.</li>
                <li>The deposit for this subaccount will be returned to you.</li>
              </>)}
            </ul>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={closeTxDialog}
            className="border-[#E6007A] text-inherit hover:bg-[#E6007A] hover:text-[#FFFFFF]"
          >
            Cancel
          </Button>
          <Button
            onClick={submitTransaction} disabled={isTxBusy}
            className="bg-[#E6007A] text-[#FFFFFF] hover:bg-[#BC0463]"
          >
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
