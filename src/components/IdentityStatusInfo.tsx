import { Info, AlertCircle, CheckCircle, Clock } from "lucide-react";
import { useMemo } from "react";

import { IdentityVerificationStatus } from "@/types/Identity";

export const IdentityStatusInfo = ({ status }: { status: IdentityVerificationStatus }) => {
  const statusConfig = useMemo(() => {
    switch (status) {
      case IdentityVerificationStatus.NoIdentity:
        return {
          icon: AlertCircle,
          color: "text-red-400",
          bgColor: "bg-red-500/10 border-red-500/30",
          title: "No Identity",
          description: "Set up your on-chain identity to proceed with verification."
        };
      case IdentityVerificationStatus.IdentitySet:
        return {
          icon: Info,
          color: "text-orange-400",
          bgColor: "bg-orange-500/10 border-orange-500/30",
          title: "Identity Set",
          description: "Your identity is set. Proceed to request verification from a registrar."
        };
      case IdentityVerificationStatus.JudgementRequested:
        return {
          icon: Clock,
          color: "text-yellow-400",
          bgColor: "bg-yellow-500/10 border-yellow-500/30",
          title: "Judgement Requested",
          description: "Verification request submitted. Awaiting payment confirmation."
        };
      case IdentityVerificationStatus.FeePaid:
        return {
          icon: Clock,
          color: "text-blue-400",
          bgColor: "bg-blue-500/10 border-blue-500/30",
          title: "Fee Paid",
          description: "Payment confirmed. Complete verification challenges to secure your identity."
        };
      case IdentityVerificationStatus.IdentityVerified:
        return {
          icon: CheckCircle,
          color: "text-green-400",
          bgColor: "bg-green-500/10 border-green-500/30",
          title: "Identity Verified",
          description: "Your identity is verified! Your account now has verified status."
        };
      default:
        return {
          icon: Info,
          color: "text-gray-400",
          bgColor: "bg-gray-500/10 border-gray-500/30",
          title: "Unknown Status",
          description: "Identity status unknown."
        };
    }
  }, [status]);

  const Icon = statusConfig.icon;

  return (
    <div className="py-4 border-b border-gray-700/50">
      <div className="flex items-start gap-3">
        <Icon className={`w-4 h-4 ${statusConfig.color} flex-shrink-0 mt-0.5`} />
        <div className="flex-1 min-w-0">
          <div className={`text-sm font-medium mb-1 ${statusConfig.color}`}>
            {statusConfig.title}
          </div>
          <div className="text-sm text-gray-400">
            {statusConfig.description}
          </div>
        </div>
      </div>
    </div>
  );
}
