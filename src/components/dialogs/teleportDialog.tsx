import { Dialog } from "@radix-ui/react-dialog";
import BigNumber from "bignumber.js";

import { Button } from "../ui/button";
import { DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";

import { useEffect, useState } from "react";
import Teleporter from "./Teleporter";
import { usePolkadotApi } from "@/contexts/PolkadotApiContext";

export const TeleporterDialog = ({
  isTxBusy,
  open,
  setOpen,
  teleportAmount: initialTeleportAmount,
}: {
  isTxBusy: boolean;
  open: boolean;
  setOpen: (open: boolean) => void;
  teleportAmount: BigNumber;
}) => {
  const { xcmParams } = usePolkadotApi();
  const teleportAmount = xcmParams.txTotalCost
  const setTeleportAmount = (amount: BigNumber) => {
    xcmParams.txTotalCost = amount
  }

  useEffect(() => {
    if (initialTeleportAmount) {
      setTeleportAmount(initialTeleportAmount);
    }
  }, [initialTeleportAmount, setTeleportAmount]);

  const [onTeleportClick, setOnTeleportClick] = useState<() => void>(() => () => { });

  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogContent className="bg-gray-900 border-gray-700">
      <DialogHeader>
        <DialogTitle className="text-white">Teleport Tokens</DialogTitle>
      </DialogHeader>
      <div className="overflow-y-auto max-h-[80vh]">
        <Teleporter
          teleportAmount={teleportAmount}
          setTeleportAmount={setTeleportAmount}
          setOnTeleportClick={setOnTeleportClick}
        />
      </div>
      <DialogFooter className="gap-2">
        <Button
          variant="outline"
          onClick={() => setOpen(false)}
          className="border-gray-600 text-gray-300 hover:bg-gray-800"
        >
          Cancel
        </Button>
        <Button
          variant="default"
          disabled={teleportAmount.isZero() || isTxBusy}
          onClick={onTeleportClick}
          className="bg-pink-600 hover:bg-pink-700 text-white"
        >
          Confirm Teleport
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
}
