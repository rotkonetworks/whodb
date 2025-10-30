import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { CheckCircle, Loader2, Send } from "lucide-react"
import { VerificationChallenge } from "./VerificationChallenge"
import { FieldInstructions } from "./FieldInstructions"
import type { IdentityData } from "@/types/Identity"
import type { ContactLink } from "@/utils/registrar-contacts"

interface ProgressiveFieldProps {
  fieldKey: keyof IdentityData
  label: string
  placeholder: string
  description?: string
  value: string
  isVerifiable: boolean
  isVerified: boolean
  hasChallenge: boolean
  challengeCode?: string
  contactLink?: ContactLink
  registrarEmail?: string
  onChange: (value: string) => void
  onKeyPress: (e: React.KeyboardEvent) => void
  onRequestVerification: () => void
  disabled?: boolean
}

export function ProgressiveField({
  fieldKey,
  label,
  placeholder,
  description,
  value,
  isVerifiable,
  isVerified,
  hasChallenge,
  challengeCode,
  contactLink,
  registrarEmail,
  onChange,
  onKeyPress,
  onRequestVerification,
  disabled = false,
}: ProgressiveFieldProps) {
  const handleCopy = () => {
    if (challengeCode) {
      navigator.clipboard.writeText(challengeCode)
    }
  }

  const showVerificationStatus = isVerifiable && value
  const showRequestButton = isVerifiable && value && !hasChallenge && !isVerified
  const showChallenge = isVerifiable && hasChallenge && !isVerified && contactLink && challengeCode

  return (
    <div className="space-y-4">
      {/* Field instructions */}
      <FieldInstructions
        fieldKey={fieldKey}
        isVerifiable={isVerifiable}
        hasValue={Boolean(value)}
        hasChallenge={hasChallenge}
        isVerified={isVerified}
        registrarEmail={registrarEmail}
      />

      {/* Input field */}
      <div className="flex gap-2 items-center">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyPress={onKeyPress}
          placeholder={placeholder}
          autoFocus
          disabled={disabled}
          className="flex-1 text-lg py-6 bg-gray-800/50 border-gray-700 focus:border-pink-500"
        />

        {showVerificationStatus && (
          <>
            {isVerified ? (
              <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0" />
            ) : hasChallenge ? (
              <Loader2 className="w-6 h-6 text-blue-400 animate-spin flex-shrink-0" />
            ) : null}
          </>
        )}
      </div>

      {/* Request verification button */}
      {showRequestButton && (
        <div className="space-y-2">
          <Button
            type="button"
            onClick={onRequestVerification}
            disabled={disabled}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Send className="w-4 h-4 mr-2" />
            Request Verification Code
          </Button>
          <p className="text-xs text-gray-400 text-center">
            Verification codes are valid for 24 hours
          </p>
        </div>
      )}

      {/* Verification challenge */}
      {showChallenge && (
        <VerificationChallenge
          code={challengeCode}
          contactLink={contactLink}
          onCopy={handleCopy}
        />
      )}
    </div>
  )
}
