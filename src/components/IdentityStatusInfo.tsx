import { Info } from "lucide-react";
import { useMemo } from "react";

import { IdentityVerificationStatus } from "@/types/Identity";

import { Alert, AlertDescription, AlertTitle } from "./ui/alert";

export const IdentityStatusInfo = ({ status }: { status: IdentityVerificationStatus }) => {
  const statusInfo = useMemo(() => {
    switch (status) {
      case IdentityVerificationStatus.NoIdentity:
        return {
          color: "text-gray-400",
          bgColor: "bg-gray-800/30 border-gray-700/50",
          text: "No Identity",
          icon: "⚪"
        };
      case IdentityVerificationStatus.IdentitySet:
        return {
          color: "text-orange-400",
          bgColor: "bg-orange-900/20 border-orange-700/30",
          text: "Identity Set",
          icon: "🟠"
        };
      case IdentityVerificationStatus.IdentityVerified:
        return {
          color: "text-green-400",
          bgColor: "bg-green-900/20 border-green-700/30",
          text: "Verified",
          icon: "✓"
        };
      case IdentityVerificationStatus.JudgementRequested:
      case IdentityVerificationStatus.FeePaid:
        return {
          color: "text-yellow-400",
          bgColor: "bg-yellow-900/20 border-yellow-700/30",
          text: status === IdentityVerificationStatus.FeePaid ? "Fee Paid" : "Judgment Requested",
          icon: "⏳"
        };
      case IdentityVerificationStatus.PendingJudgement:
        return {
          color: "text-blue-400",
          bgColor: "bg-blue-900/20 border-blue-700/30",
          text: "Pending Judgment",
          icon: "⏳"
        };
      default:
        return {
          color: "text-gray-400",
          bgColor: "bg-gray-800/30 border-gray-700/50",
          text: "Unknown",
          icon: "?"
        };
    }
  }, [status]);

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 text-sm rounded-full border ${statusInfo.bgColor} ${statusInfo.color}`}>
      <span className="text-base">{statusInfo.icon}</span>
      <span className="font-medium">On-chain Status: {statusInfo.text}</span>
    </div>
  );
}
