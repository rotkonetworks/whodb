import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ExternalLink } from "lucide-react";
import { ContactLink } from "@/utils/registrar-contacts";

interface VerificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: ContactLink;
  challengeCode: string;
}

export function VerificationDialog({
  open,
  onOpenChange,
  contact,
  challengeCode,
}: VerificationDialogProps) {
  // Determine if URL can be safely iframed
  // Only iframe matrix.to and twitter (with caution)
  const canIframe = contact.url.includes('matrix.to');

  const handleCopyCode = () => {
    navigator.clipboard.writeText(challengeCode);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${canIframe ? 'max-w-4xl h-[80vh]' : 'max-w-md'} p-0 flex flex-col`}>
        <DialogHeader className="p-6 pb-4 flex-shrink-0">
          <DialogTitle>Verify via {contact.platform}</DialogTitle>
          <DialogDescription>
            {contact.instruction}
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-4 flex-shrink-0">
          <div className="flex items-center gap-2 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <span className="text-sm text-gray-600 dark:text-gray-400">Code:</span>
            <code className="flex-1 text-sm font-mono text-pink-500">{challengeCode}</code>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyCode}
              className="h-auto py-1"
            >
              copy
            </Button>
          </div>
        </div>

        {canIframe ? (
          <div className="flex-1 min-h-0 px-6 pb-4">
            <iframe
              src={contact.url}
              className="w-full h-full border border-gray-200 dark:border-gray-700 rounded-lg"
              title={`Verify via ${contact.platform}`}
              sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
            />
          </div>
        ) : (
          <div className="px-6 pb-4">
            <p className="text-sm text-gray-400 mb-4">
              Click below to open {contact.platform} and send your verification code.
            </p>
            <Button
              onClick={() => window.open(contact.url, '_blank')}
              className="w-full"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Open {contact.platform}
            </Button>
          </div>
        )}

        <div className="px-6 pb-6 flex justify-end gap-2 flex-shrink-0">
          {canIframe && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(contact.url, '_blank')}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Open in New Tab
            </Button>
          )}
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
