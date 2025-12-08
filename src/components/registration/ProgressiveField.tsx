import { useEffect, useRef } from "react"
import { Input } from "@/components/ui/input"
import { CheckCircle, Loader2, ExternalLink, Copy, Check } from "lucide-react"
import { FieldInstructions } from "./FieldInstructions"
import type { IdentityData } from "@/types/Identity"
import type { ContactLink } from "@/utils/registrar-contacts"

interface ProgressiveFieldProps {
  fieldKey: keyof IdentityData
  label: string
  placeholder: string
  value: string
  isVerifiable: boolean
  isVerified: boolean
  hasChallenge: boolean
  autoCopied?: boolean
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
  placeholder,
  value,
  isVerifiable,
  isVerified,
  hasChallenge,
  autoCopied,
  challengeCode,
  contactLink,
  registrarEmail,
  onChange,
  onKeyPress,
  disabled = false,
}: ProgressiveFieldProps) {
  const linkRef = useRef<HTMLAnchorElement>(null)

  // Auto-open send link when code is ready (after a brief delay to let user see it)
  useEffect(() => {
    if (hasChallenge && challengeCode && contactLink && !isVerified) {
      const timer = setTimeout(() => {
        // Focus the send link so user can just press Enter
        linkRef.current?.focus()
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [hasChallenge, challengeCode, contactLink, isVerified])

  const handleCopy = () => {
    if (challengeCode) {
      navigator.clipboard.writeText(challengeCode)
    }
  }

  const showChallenge = isVerifiable && hasChallenge && !isVerified && contactLink && challengeCode

  return (
    <div className="space-y-2">
      {/* Input with inline status */}
      <div className="flex gap-2 items-center">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyPress={onKeyPress}
          placeholder={placeholder}
          autoFocus={!showChallenge}
          disabled={disabled}
          className="flex-1 text-base py-5 bg-gray-800/50 border-gray-700 focus:border-pink-500"
        />

        <FieldInstructions
          fieldKey={fieldKey}
          isVerifiable={isVerifiable}
          hasValue={Boolean(value)}
          hasChallenge={hasChallenge}
          isVerified={isVerified}
          registrarEmail={registrarEmail}
        />

        {isVerifiable && value && (
          isVerified ? (
            <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
          ) : hasChallenge ? (
            <Loader2 className="w-5 h-5 text-yellow-400 animate-spin flex-shrink-0" />
          ) : (
            <Loader2 className="w-5 h-5 text-gray-600 animate-spin flex-shrink-0" />
          )
        )}
      </div>

      {/* Verification challenge - compact inline */}
      {showChallenge && (
        <div className="flex items-center gap-2 bg-gray-800/80 rounded px-3 py-2 border border-yellow-500/30">
          <code className="text-sm font-mono text-yellow-300 flex-1">{challengeCode}</code>
          <button
            type="button"
            onClick={handleCopy}
            className="p-1 text-gray-400 hover:text-white rounded transition-colors"
            title={autoCopied ? "Copied!" : "Copy code"}
          >
            {autoCopied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
          </button>
          <a
            ref={linkRef}
            href={contactLink.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-2 py-1 bg-pink-500 hover:bg-pink-600 rounded text-xs text-white font-medium transition-colors"
          >
            Send <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}
    </div>
  )
}
