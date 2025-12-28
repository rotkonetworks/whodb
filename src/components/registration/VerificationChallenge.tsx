import { Copy, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { ContactLink } from "@/utils/registrar-contacts"
import { useState } from "react"

interface VerificationChallengeProps {
  code: string
  contactLink: ContactLink
  onCopy: () => void
}

export function VerificationChallenge({ code, contactLink, onCopy }: VerificationChallengeProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    onCopy()
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <code className="text-lg font-mono font-medium text-white tracking-wider">
            {code}
          </code>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs text-white flex items-center gap-1 transition-colors"
          title="Copy code"
        >
          <Copy className="w-3 h-3" />
          {copied ? "Copied" : "Copy"}
        </button>
        <a
          href={contactLink.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Button size="sm" className="bg-pink-500 hover:bg-pink-600 text-white text-xs px-3">
            Send
            <ExternalLink className="w-3 h-3 ml-1" />
          </Button>
        </a>
      </div>
    </div>
  )
}
