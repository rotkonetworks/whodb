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
    <DialogContent className="dark:bg-gray-900/50 bg-grey-100/50 backdrop-blur-sm">
      <DialogHeader>
        <DialogTitle>Teleport</DialogTitle>
      </DialogHeader>
      <div className="overflow-y-auto max-h-[80vh]">
        <Teleporter
          teleportAmount={teleportAmount}
          setTeleportAmount={setTeleportAmount}
          setOnTeleportClick={setOnTeleportClick}
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
          onClick={onTeleportClick}
        >
          Confirm
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
}
