import { Sparkles, Target, CheckCircle } from "lucide-react"

interface FieldRequirementsProps {
  verifiedFieldsCount: number
  hasDisplayName: boolean
  className?: string
}

const TOTAL_VERIFIABLE_FIELDS = 6 // Email, Matrix, Twitter, Website, GitHub, PGP

export function FieldRequirements({ verifiedFieldsCount, hasDisplayName, className = "" }: FieldRequirementsProps) {
  const getEncouragementMessage = () => {
    if (verifiedFieldsCount === 0) {
      return hasDisplayName
        ? "Great, you've set a display name! Verifying other fields will build more trust."
        : "Set a display name or verify at least one field to get started."
    }
    if (verifiedFieldsCount === 1) {
      return hasDisplayName
        ? "Excellent! Your display name is set and one field is verified."
        : "Good job! One field verified. Adding a display name is recommended."
    }
    if (verifiedFieldsCount < TOTAL_VERIFIABLE_FIELDS) {
      return `Keep it up! ${verifiedFieldsCount}/${TOTAL_VERIFIABLE_FIELDS} fields verified.`
    }
    return "Excellent! All possible fields are verified."
  }

  const getProgressColor = () => {
    if (verifiedFieldsCount === 0 && !hasDisplayName) return "text-gray-400"
    if (verifiedFieldsCount <= TOTAL_VERIFIABLE_FIELDS / 2) return "text-yellow-400"
    if (verifiedFieldsCount < TOTAL_VERIFIABLE_FIELDS) return "text-blue-400"
    return "text-green-400"
  }

  const getIcon = () => {
    if (verifiedFieldsCount === 0 && !hasDisplayName) {
      return <Target className="w-4 h-4 text-gray-400 mr-2" />
    }
    if (verifiedFieldsCount < TOTAL_VERIFIABLE_FIELDS) {
      return <Sparkles className="w-4 h-4 text-pink-400 mr-2" />
    }
    return <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
  }

  const progressPercentage = hasDisplayName
    ? ((verifiedFieldsCount + 1) / (TOTAL_VERIFIABLE_FIELDS + 1)) * 100
    : (verifiedFieldsCount / (TOTAL_VERIFIABLE_FIELDS + 1)) * 100

  return (
    <div className={`bg-gray-800/50 border border-gray-700 rounded-lg p-4 ${className}`}>
      <div className="flex items-center mb-2">
        {getIcon()}
        <span className={`text-sm font-medium ${getProgressColor()}`}>
          {hasDisplayName && `${verifiedFieldsCount > 0 ? "Name & " : "Name set"}`}
          {verifiedFieldsCount > 0 &&
            `${verifiedFieldsCount} other field${verifiedFieldsCount !== 1 ? "s" : ""} verified`}
          {!hasDisplayName &&
            verifiedFieldsCount > 0 &&
            `${verifiedFieldsCount} field${verifiedFieldsCount !== 1 ? "s" : ""} verified`}
          {!hasDisplayName && verifiedFieldsCount === 0 && "No fields set"}
        </span>
      </div>
      <p className="text-gray-400 text-xs">{getEncouragementMessage()}</p>

      {/* Progress bar */}
      <div className="mt-3 w-full bg-gray-700 rounded-full h-1.5">
        <div
          className="bg-gradient-to-r from-pink-500 to-purple-500 h-1.5 rounded-full transition-all duration-300"
          style={{ width: `${Math.min(progressPercentage, 100)}%` }}
          aria-valuenow={verifiedFieldsCount + (hasDisplayName ? 1 : 0)}
          aria-valuemin={0}
          aria-valuemax={TOTAL_VERIFIABLE_FIELDS + 1}
          role="progressbar"
          aria-label={`${verifiedFieldsCount} of ${TOTAL_VERIFIABLE_FIELDS} optional fields verified, display name ${hasDisplayName ? "set" : "not set"}`}
        />
      </div>
    </div>
  )
}
