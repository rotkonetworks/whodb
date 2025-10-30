import { AlertCircle, CheckCircle, Clock, Mail, Send } from "lucide-react"

interface FieldInstructionsProps {
  fieldKey: string
  isVerifiable: boolean
  hasValue: boolean
  hasChallenge: boolean
  isVerified: boolean
  registrarEmail?: string
}

const INSTRUCTIONS = {
  display: {
    title: "Your on-chain identity",
    description: "Choose how you want to be known across the ecosystem. This will be publicly visible.",
    required: true,
  },
  email: {
    title: "Email verification",
    description: "Receive a challenge code by email and forward it to the registrar. Stored publicly on-chain.",
    required: false,
  },
  twitter: {
    title: "Twitter verification",
    description: "Send your challenge code to the registrar to prove you control this account. Stored publicly on-chain.",
    required: false,
  },
  matrix: {
    title: "Matrix verification",
    description: "Message the registrar with your challenge code. Your Matrix ID will be stored publicly on-chain.",
    required: false,
  },
  discord: {
    title: "Discord verification",
    description: "DM the registrar your challenge code to verify account ownership. Stored publicly on-chain.",
    required: false,
  },
  web: {
    title: "Website verification",
    description: "Prove domain ownership by contacting the registrar with your challenge code. Stored publicly on-chain.",
    required: false,
  },
  github: {
    title: "GitHub verification",
    description: "Your GitHub username, stored publicly on-chain. Future OAuth verification coming soon.",
    required: false,
  },
  pgp_fingerprint: {
    title: "PGP fingerprint",
    description: "Your public key fingerprint (0xABCD...) for encrypted communication. Proves you control the private key.",
    required: false,
  },
}

export function FieldInstructions({
  fieldKey,
  isVerifiable,
  hasValue,
  hasChallenge,
  isVerified,
  registrarEmail,
}: FieldInstructionsProps) {
  const instruction = INSTRUCTIONS[fieldKey as keyof typeof INSTRUCTIONS]

  if (!instruction) return null

  return (
    <div className="space-y-3">
      {/* Field context */}
      <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/50">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-sm font-medium text-white mb-1">
              {instruction.title}
            </div>
            <div className="text-xs text-gray-400">
              {instruction.description}
            </div>
          </div>
        </div>
      </div>

      {/* Verification flow status */}
      {isVerifiable && hasValue && (
        <div className="space-y-2">
          {/* Step 1: Challenge code generated */}
          <div className="flex items-start gap-3">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
              hasChallenge ? 'bg-blue-500' : 'bg-gray-700'
            }`}>
              {hasChallenge ? (
                <CheckCircle className="w-4 h-4 text-white" />
              ) : (
                <span className="text-xs text-gray-400">1</span>
              )}
            </div>
            <div className="flex-1">
              <div className="text-sm text-white">Challenge code generated</div>
              <div className="text-xs text-gray-400">
                {hasChallenge ? "Ready to send to registrar" : "Generating..."}
              </div>
            </div>
          </div>

          {/* Step 2: Send to registrar */}
          <div className="flex items-start gap-3">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
              hasChallenge && !isVerified ? 'bg-yellow-500' : hasChallenge ? 'bg-blue-500' : 'bg-gray-700'
            }`}>
              {hasChallenge && !isVerified ? (
                <Send className="w-4 h-4 text-white" />
              ) : hasChallenge ? (
                <CheckCircle className="w-4 h-4 text-white" />
              ) : (
                <span className="text-xs text-gray-400">2</span>
              )}
            </div>
            <div className="flex-1">
              <div className="text-sm text-white">Send code to registrar</div>
              <div className="text-xs text-gray-400">
                {hasChallenge && registrarEmail ? (
                  <>Click the link below to email {registrarEmail}</>
                ) : hasChallenge ? (
                  "Contact information will appear below"
                ) : (
                  "Waiting for step 1..."
                )}
              </div>
            </div>
          </div>

          {/* Step 3: Wait for verification */}
          <div className="flex items-start gap-3">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
              isVerified ? 'bg-green-500' : hasChallenge ? 'bg-gray-700 border-2 border-gray-600' : 'bg-gray-700'
            }`}>
              {isVerified ? (
                <CheckCircle className="w-4 h-4 text-white" />
              ) : hasChallenge ? (
                <Clock className="w-4 h-4 text-gray-400" />
              ) : (
                <span className="text-xs text-gray-400">3</span>
              )}
            </div>
            <div className="flex-1">
              <div className="text-sm text-white">Verification confirmation</div>
              <div className="text-xs text-gray-400">
                {isVerified ? (
                  <span className="text-green-400">✓ Verified! You can continue.</span>
                ) : hasChallenge ? (
                  "Waiting for registrar to confirm..."
                ) : (
                  "Automatic once registrar receives code"
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
