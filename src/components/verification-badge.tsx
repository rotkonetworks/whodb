import { Verified, Shield, ShieldQuestion } from "lucide-react"
import { Badge } from "@/components/ui/badge"

/**
 * Returns a verification badge based on the verification status and judgement.
 * Badges are now consistently smaller.
 * @param verified Whether the profile is verified
 * @param judgement The judgement status from the registrar
 * @returns A Badge component with appropriate styling and text
 */
export function getVerificationBadge(verified: boolean, judgement: string) {
  const baseClasses = "text-xs px-1.5 py-0.5 flex items-center" // Smaller padding

  if (verified && judgement === "KnownGood") {
    return (
      <Badge className={`${baseClasses} bg-green-500/20 text-green-400 border-green-500/30`}>
        <Verified className="w-2.5 h-2.5 mr-1" /> {/* Smaller icon */}
        Verified
      </Badge>
    )
  } else if (verified && judgement === "Reasonable") {
    return (
      <Badge className={`${baseClasses} bg-yellow-500/20 text-yellow-400 border-yellow-500/30`}>
        <Shield className="w-2.5 h-2.5 mr-1" /> {/* Smaller icon */}
        Reasonable
      </Badge>
    )
  } else if (judgement === "Fee Paid") {
    return (
      <Badge className={`${baseClasses} bg-purple-500/20 text-purple-400 border-purple-500/30`}>
        <Shield className="w-2.5 h-2.5 mr-1" /> {/* Smaller icon */}
        Fee Paid
      </Badge>
    )
  } else {
    return (
      <Badge className={`${baseClasses} bg-gray-500/20 text-gray-400 border-gray-500/30`}>
        <ShieldQuestion className="w-2.5 h-2.5 mr-1" />{" "}
        {/* Smaller icon, changed from AlertTriangle for "Unverified" */}
        Unverified
      </Badge>
    )
  }
}
