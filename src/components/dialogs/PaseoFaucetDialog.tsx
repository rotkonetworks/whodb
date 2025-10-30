import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CopyButton } from "@/components/ui/copy-button";
import { ExternalLink, CheckCircle } from "lucide-react";
import { toast } from "sonner";

interface PaseoFaucetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  address: string;
  onFundsReceived?: () => void;
}

export function PaseoFaucetDialog({ open, onOpenChange, address, onFundsReceived }: PaseoFaucetDialogProps) {
  const faucetUrl = `https://faucet.polkadot.io/?parachain=1004`;

  const handleGotTokens = () => {
    toast.success("Great! The form will automatically detect your balance.");
    if (onFundsReceived) {
      onFundsReceived();
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[90vh] p-0 flex flex-col">
        <DialogHeader className="p-6 pb-4 flex-shrink-0">
          <DialogTitle>Get Paseo Testnet Tokens</DialogTitle>
          <DialogDescription>
            Use the Parity faucet to receive free PAS tokens. Copy your address below and paste it into the faucet.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-4 flex-shrink-0">
          <div className="flex items-center gap-2 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <span className="text-sm text-gray-600 dark:text-gray-400">Your Address:</span>
            <code className="flex-1 text-sm font-mono truncate">{address}</code>
            <CopyButton text={address} />
          </div>
        </div>

        <div className="flex-1 min-h-0 px-6 pb-4">
          <iframe
            src={faucetUrl}
            className="w-full h-full border border-gray-200 dark:border-gray-700 rounded-lg"
            title="Paseo Faucet"
          />
        </div>

        <div className="px-6 pb-6 flex justify-between items-center flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(faucetUrl, '_blank')}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Open in New Tab
          </Button>
          <div className="flex gap-2">
            <Button
              variant="default"
              onClick={handleGotTokens}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              I Got Tokens
            </Button>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
