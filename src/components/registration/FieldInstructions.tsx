import { Info, CheckCircle, Clock, Send } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface FieldInstructionsProps {
  fieldKey: string
  isVerifiable: boolean
  hasValue: boolean
  hasChallenge: boolean
  isVerified: boolean
  registrarEmail?: string
}

const TOOLTIPS: Record<string, string> = {
  display: "Publicly visible on-chain identity name",
  email: "Email for verification, stored on-chain",
  twitter: "Twitter handle, verified via DM to registrar",
  matrix: "Matrix ID, verified via message to registrar",
  discord: "Discord tag, verified via DM to registrar",
  web: "Website domain, verified via registrar contact",
  github: "GitHub username (OAuth coming soon)",
  pgp_fingerprint: "PGP fingerprint (0xABCD...) for encrypted comms",
}

export function FieldInstructions({
  fieldKey,
  isVerifiable,
  hasValue,
  hasChallenge,
  isVerified,
}: FieldInstructionsProps) {
  const tooltip = TOOLTIPS[fieldKey]
  if (!tooltip) return null

  // Compact verification status - only show when relevant
  const showStatus = isVerifiable && hasValue

  return (
    <div className="flex items-center gap-2">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" className="text-gray-500 hover:text-gray-300">
              <Info className="w-4 h-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <p className="text-xs">{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {showStatus && (
        <div className="flex items-center gap-1.5 text-xs">
          {isVerified ? (
            <span className="text-green-400 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              Verified
            </span>
          ) : hasChallenge ? (
            <span className="text-yellow-400 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Awaiting
            </span>
          ) : (
            <span className="text-gray-500 flex items-center gap-1">
              <Send className="w-3 h-3" />
              Unverified
            </span>
          )}
        </div>
      )}
    </div>
  )
}
