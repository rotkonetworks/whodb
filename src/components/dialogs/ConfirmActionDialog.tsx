import BigNumber from "bignumber.js";
import { AlertCircle, Coins } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DialogMode, EstimatedCostInfo, FormatAmountFn, OpenTxDialogArgs } from "@/types";
import { Identity } from "@/types/Identity";
import { ApiTx } from "@/types/api";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";


export default function ConfirmActionDialog({
  openDialog,
  name,
  closeTxDialog,
  openTxDialog,
  submitTransaction,
  estimatedCosts,
  txToConfirm,
  balance,
  formatAmount,
  identity,
  isTxBusy,
}: {
  openDialog: DialogMode;
  name: string | null;
  closeTxDialog: () => void;
  openTxDialog: (dialog: OpenTxDialogArgs) => void;
  submitTransaction: () => void;
  estimatedCosts: EstimatedCostInfo;
  txToConfirm: ApiTx;
  balance: BigNumber;
  formatAmount: FormatAmountFn;
  identity: Identity;
  isTxBusy: boolean;
}) {
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
      <DialogContent className="dark:bg-gray-900/50 bg-gray-100/50 backdrop-blur-sm">
        <DialogHeader>
          {/* TODO Add transaction name */}
          <DialogTitle>{name || "Confirm Transaction"}</DialogTitle>
          <DialogDescription>
            Please review the following information before confirming this transaction.
          </DialogDescription>
        </DialogHeader>
        <div className="overflow-y-auto max-h-[80vh] space-y-4">
          {Object.keys(estimatedCosts).length > 0 && (
            <Card className="bg-gray-700/30 border-gray-600">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Coins className="h-5 w-5" />
                  Transaction Costs
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {estimatedCosts.fees && (
                    <div className="flex items-center justify-between py-2 border-b border-gray-600 last:border-b-0">
                      <span className="text-gray-400">Total estimated cost:</span>
                      <span className="text-white font-mono text-sm">
                        {formatAmount(estimatedCosts.fees)}
                      </span>
                    </div>
                  )}
                  {estimatedCosts.deposits && (
                    <div className="flex items-center justify-between py-2 border-b border-gray-600 last:border-b-0">
                      <span className="text-gray-400">Existential deposit:</span>
                      <span className="text-white font-mono text-sm">
                        {formatAmount(estimatedCosts.deposits)}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between py-2">
                    <span className="text-gray-400">Current balance:</span>
                    <span className="text-white font-mono text-sm">
                      {formatAmount(balance)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="bg-gray-700/30 border-gray-600">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Important Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="space-y-2 list-disc list-inside text-gray-300">
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
                    After having fees paid, you will need to complete all verification challenges
                    in order to be verified.
                  </li>
                </>)}
                {["setIdentity", "requestJudgement"].includes(openDialog) && (<>
                  <li>Your identity information will remain publicly visible on-chain to everyone until you clear it.</li>
                  <li>Please ensure all provided information is accurate before submission.</li>
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
            </CardContent>
          </Card>
        </div>
        <DialogFooter>
          <Button
            variant="secondary"
            onClick={closeTxDialog}
          >
            Cancel
          </Button>
          <Button
            variant="default"
            onClick={submitTransaction}
            disabled={isTxBusy}
          >
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
