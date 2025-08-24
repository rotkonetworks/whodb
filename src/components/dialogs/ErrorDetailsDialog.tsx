import { Button } from "@/lib/ui";

import { GenericDialog } from "./GenericDialog";

export default function ErrorDetailsDialog({
  open,
  handleOpenChange,
  errorDetails,
  setErrorDetails,
  addAlert,
}: {
  open: boolean;
  handleOpenChange: (open: boolean) => void;
  errorDetails: Error | null;
  setErrorDetails: (error: Error | null) => void;
  addAlert: (alert: { type: string; message: string }) => void;
}) {
  return (
    <GenericDialog open={open} onOpenChange={handleOpenChange}
      title="Error details"
      footer={<>
        <Button variant="outline" onClick={() => {
          setErrorDetails(null);
        }}>Close</Button>
        <Button onClick={() => {
          if (errorDetails) {
            const fullError = `${errorDetails.message}\n${errorDetails.stack || ''}`;
            navigator.clipboard.writeText(fullError)
              .then(() => {
                addAlert({
                  type: "success",
                  message: "Error details copied to clipboard",
                });
              })
              .catch(err => {
                addAlert({
                  type: "error",
                  message: "Failed to copy error details",
                });
                console.error("Failed to copy:", err);
              });
          }
        }}>
          Copy to Clipboard
        </Button>
      </>}
    >
      <div className="overflow-y-auto max-h-[66vh] sm:max-h-[75vh]">
        <pre className="text-sm text-red-500">
          {errorDetails?.message}
          {errorDetails?.stack}
        </pre>
      </div>
    </GenericDialog>
  );
}
