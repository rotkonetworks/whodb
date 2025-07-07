import { Info } from "lucide-react";
import { useMemo } from "react";

import { verifyStatuses } from "@/types/Identity";

import { Alert, AlertDescription, AlertTitle } from "./ui/alert";

export const IdentityStatusInfo = ({ status }: { status: verifyStatuses }) => {
  const verifiyStatusColor = useMemo(() => {
    switch (status) {
      case verifyStatuses.NoIdentity:
        return "dark:text-red-300 text-red-700";
      case verifyStatuses.IdentitySet:
        return "dark:text-orange-300 text-orange-700";
      case verifyStatuses.IdentityVerified:
        return "dark:text-green-300 text-green-700";
      case verifyStatuses.JudgementRequested:
      case verifyStatuses.FeePaid:
        return "dark:text-yellow-300 text-yellow-700";
      default:
        return "dark:text-gray-300 text-gray-700";
    }
  }, [status]);

  return <>
    <Alert variant="default"
      className="dark:bg-[#393838] bg-[#ffffff] border-[#E6007A] dark:text-light text-dark"
    >
      <Info className="h-4 w-4" />
      <AlertTitle>On-chain Identity Status
        : <strong className={verifiyStatusColor}>
          {verifyStatuses[status]?.match(/[A-Z][a-z]+/g).join(" ") || "Unknown"}
        </strong>
      </AlertTitle>
      <AlertDescription>
        {status === verifyStatuses.NoIdentity
          && "Identity verification required. Set up your on-chain identity to proceed with verification."}
        {status === verifyStatuses.IdentitySet
          && "Identity information is now set. You can now proceed to request verification from registrar."}
        {status === verifyStatuses.JudgementRequested
          && "Verification request submitted."}
        {status === verifyStatuses.FeePaid
          && "Payment confirmed. Complete the verification challenges to secure your identity."}
        {status === verifyStatuses.IdentityVerified
          && "Identity verified successfully! Your account now has verified status."}
      </AlertDescription>
    </Alert>
  </>;
}
