import { Copy, Mail, ExternalLink, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { ContactLink } from "@/utils/registrar-contacts"

interface VerificationChallengeProps {
  code: string
  contactLink: ContactLink
  onCopy: () => void
}

export function VerificationChallenge({ code, contactLink, onCopy }: VerificationChallengeProps) {
  return (
    <div className="bg-gradient-to-br from-blue-900/30 to-purple-900/20 rounded-lg p-5 border-2 border-blue-500/40 shadow-lg">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
          <Mail className="w-5 h-5 text-blue-400" />
        </div>
        <div className="flex-1">
          <div className="text-base font-semibold text-white mb-1">
            Send Your Verification Code
          </div>
          <div className="text-sm text-gray-300">
            To prove ownership of this {contactLink.platform.toLowerCase()}, send the code below to the registrar.
          </div>
        </div>
      </div>

      {/* Code display */}
      <div className="bg-black/30 rounded-lg p-4 mb-4 border border-gray-700/50">
        <div className="text-xs text-gray-400 mb-2">Your verification code:</div>
        <div className="flex items-center gap-3">
          <code className="text-2xl font-mono font-bold text-white tracking-wider flex-1">
            {code}
          </code>
          <button
            type="button"
            onClick={onCopy}
            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm text-white flex items-center gap-2 transition-colors"
            title="Copy code"
          >
            <Copy className="w-4 h-4" />
            Copy
          </button>
        </div>
      </div>

      {/* Action button */}
      <a
        href={contactLink.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
      >
        <Button className="w-full bg-pink-500 hover:bg-pink-600 text-white font-medium">
          <Mail className="w-4 h-4 mr-2" />
          Send to {contactLink.label}
          <ExternalLink className="w-4 h-4 ml-2" />
        </Button>
      </a>

      {/* Help text */}
      <div className="mt-4 flex items-start gap-2 text-xs text-gray-400">
        <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <div>
          Once the registrar receives and confirms your code, you'll automatically be able to continue.
          This usually takes a few seconds to a few minutes.
        </div>
      </div>
    </div>
  )
}
