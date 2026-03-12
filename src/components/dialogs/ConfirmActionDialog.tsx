import { Button } from "@/components/ui/button";
import { DialogMode, EstimatedCostInfo, FormatAmountFn, OpenTxDialogArgs } from "@/types";
import { ApiTx } from "@/types/api";

import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";


export default function ConfirmActionDialog({
  openDialog,
  name,
  closeTxDialog,
  openTxDialog,
  submitTransaction,
  estimatedCosts,
  txToConfirm,
  formatAmount,
  isTxBusy,
}: {
  openDialog: DialogMode;
  name: string | null;
  closeTxDialog: () => void;
  openTxDialog: (dialog: OpenTxDialogArgs) => void;
  submitTransaction: () => void;
  estimatedCosts: EstimatedCostInfo;
  txToConfirm: ApiTx;
  formatAmount: FormatAmountFn;
  isTxBusy: boolean;
}) {
  return (
    <Dialog
      open={[
        "clearIdentity", "setIdentity", "requestJudgement", "cancelRequest", "addSubaccount", "removeSubaccount",
        "quitSub", "editSubAccount"
      ].includes(openDialog as string)}
      onOpenChange={v => v
        ? openTxDialog({
          mode: openDialog,
          tx: txToConfirm,
          estimatedCosts,
        })
        : closeTxDialog()
      }
    >
      <DialogContent className="dark:bg-gray-900 bg-gray-100 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">
            Confirm {name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Simple cost display */}
          {estimatedCosts.fees && (
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">Transaction fee</span>
                <span className="text-white font-mono text-sm">
                  {formatAmount(estimatedCosts.fees)}
                </span>
              </div>
              {estimatedCosts.deposits && (
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-700">
                  <span className="text-gray-400 text-sm">Deposit (refundable)</span>
                  <span className="text-white font-mono text-sm">
                    {formatAmount(estimatedCosts.deposits)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Simplified context-specific message */}
          <div className="text-sm text-gray-400">
            {openDialog === "setIdentity" && (
              <p>Your identity will be stored on-chain and publicly visible.</p>
            )}
            {openDialog === "requestJudgement" && (
              <p>Complete verification challenges after payment to get verified.</p>
            )}
            {openDialog === "cancelRequest" && (
              <p>Cancel your verification request. Fees paid will be forfeited.</p>
            )}
            {openDialog === "clearIdentity" && (
              <p>Remove your identity from chain. Your deposit will be returned.</p>
            )}
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={closeTxDialog}
            className="flex-1"
            disabled={isTxBusy}
          >
            Cancel
          </Button>
          <Button
            onClick={submitTransaction}
            disabled={isTxBusy}
            className="flex-1 bg-pink-500 hover:bg-pink-600"
          >
            {isTxBusy ? "Processing..." : "Sign & Submit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
