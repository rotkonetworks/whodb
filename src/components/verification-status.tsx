"use client"

import { CheckCircle, Loader2, AlertTriangle, Clock } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useVerification } from "@/contexts/verification-context"

interface VerificationStatusProps {
  field: string
  value: string
  showDetails?: boolean
}

export function VerificationStatus({ field, value, showDetails = false }: VerificationStatusProps) {
  const { getFieldStatus } = useVerification()
  const status = getFieldStatus(field)

  if (!status || !value) return null

  const getIcon = () => {
    switch (status.status) {
      case "verified":
        return <CheckCircle className="w-4 h-4 text-green-400" />
      case "pending":
        return <Loader2 className="w-4 h-4 text-yellow-400 animate-spin" />
      case "failed":
        return <AlertTriangle className="w-4 h-4 text-red-400" />
      default:
        return <Clock className="w-4 h-4 text-gray-400" />
    }
  }

  const getBadge = () => {
    switch (status.status) {
      case "verified":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Verified</Badge>
      case "pending":
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Verifying</Badge>
      case "failed":
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Failed</Badge>
      default:
        return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">Unverified</Badge>
    }
  }

  const getStatusText = () => {
    // This text will only be shown if showDetails is true.
    // For "unverified", the badge is usually enough. We add text if there's more to say.
    switch (status.status) {
      case "verified":
        return `Verified${status.verificationMethod ? ` via ${status.verificationMethod}` : ""}`
      case "pending":
        return `Verification pending${status.verificationMethod ? ` with ${status.verificationMethod}` : ""}...`
      case "failed":
        return `Verification failed${status.verificationMethod ? ` with ${status.verificationMethod}` : ""}`
      case "unverified":
        return "" // Let the "Unverified" badge speak. No redundant text.
      default:
        return ""
    }
  }

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center">
        {getIcon()}
        {showDetails && getStatusText() && <span className="ml-2 text-xs text-gray-400">{getStatusText()}</span>}
      </div>
      {getBadge()}
    </div>
  )
}
