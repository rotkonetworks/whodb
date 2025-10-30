import { useEffect, useState } from "react"
import { IdentityData } from "@/types/Identity"
import { User, Mail, Globe, MessageSquare, Github, Key, Twitter, CheckCircle, Loader2, ExternalLink } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useSnapshot } from "valtio"
import { identityDraftStore, initializeDraft, updateDraftField, isDraftReadyToSubmit, markFieldVerified } from "@/store/IdentityDraftStore"
import { useVerification } from "@/contexts/verification-context"
import { useRegistrarIdentity } from "@/hooks/useRegistrarIdentity"
import { generateContactLinks } from "@/utils/registrar-contacts"
import { VerificationDialog } from "@/components/dialogs/VerificationDialog"
import { toast } from "sonner"
import { usePolkadotApi } from "@/contexts/PolkadotApiContext"

interface InlineIdentityFormProps {
  initialData: IdentityData
  onSubmit: () => void
  isEditMode: boolean
}

type VerifiableField = "email" | "twitter" | "github" | "matrix" | "discord" | "web"

export function InlineIdentityForm({
  initialData,
  onSubmit,
  isEditMode
}: InlineIdentityFormProps) {
  const snap = useSnapshot(identityDraftStore)
  const { startVerification, confirmVerification, getFieldStatus, challenges } = useVerification()
  const { registrarIndex } = usePolkadotApi()
  const { registrarInfo } = useRegistrarIdentity(registrarIndex)

  const [verificationCodes, setVerificationCodes] = useState<Record<VerifiableField, string>>({
    email: "",
    twitter: "",
    github: "",
    matrix: "",
    discord: "",
    web: "",
  })

  const [verifyingField, setVerifyingField] = useState<VerifiableField | null>(null)
  const [autoRequestedFields, setAutoRequestedFields] = useState<Set<VerifiableField>>(new Set())
  const [verificationDialogOpen, setVerificationDialogOpen] = useState(false)
  const [selectedField, setSelectedField] = useState<VerifiableField | null>(null)

  // Generate contact links from registrar identity
  const contactLinks = registrarInfo?.identity
    ? generateContactLinks(registrarInfo.identity)
    : {}

  // Initialize draft only when NOT dirty (user hasn't edited yet)
  useEffect(() => {
    if (!snap.isDirty) {
      initializeDraft(initialData)
    }
  }, [initialData.display, initialData.email]) // Only re-init on actual data change from blockchain

  const handleChange = (field: keyof IdentityData, value: string) => {
    updateDraftField(field, value)
  }

  // Proactively request verification codes when fields are filled
  useEffect(() => {
    const verifiableFields: VerifiableField[] = ['email', 'twitter', 'github', 'matrix', 'discord', 'web']

    verifiableFields.forEach(async (field) => {
      const fieldValue = snap.draft[field]
      const isVerified = snap.verifications[field]?.isVerified
      const alreadyRequested = autoRequestedFields.has(field)

      // Auto-request if: field has value, not verified, not already requested
      if (fieldValue && fieldValue.trim().length > 3 && !isVerified && !alreadyRequested) {
        setAutoRequestedFields(prev => new Set(prev).add(field))
        setVerifyingField(field)

        try {
          await startVerification(field, "code", field)
          // No toast - the inline UI shows the code
        } catch (error) {
          console.error(`Auto-verification request failed for ${field}:`, error)
          setAutoRequestedFields(prev => {
            const next = new Set(prev)
            next.delete(field)
            return next
          })
        }
      }
    })
  }, [snap.draft.email, snap.draft.twitter, snap.draft.github, snap.draft.matrix, snap.draft.discord, snap.draft.web, snap.verifications, autoRequestedFields, startVerification])


  // Auto-populate challenge codes from WebSocket
  useEffect(() => {
    Object.keys(challenges).forEach((fieldKey) => {
      const field = fieldKey as VerifiableField
      const challenge = challenges[field]
      if (challenge?.code && !verificationCodes[field]) {
        setVerificationCodes(prev => ({ ...prev, [field]: challenge.code }))
      }
    })
  }, [challenges])

  // Sync verification status from verification context to draft store
  useEffect(() => {
    const verifiableFields: VerifiableField[] = ['email', 'twitter', 'github', 'matrix', 'discord', 'web']

    verifiableFields.forEach((field) => {
      const status = getFieldStatus(field)
      if (status?.status === 'verified' && !snap.verifications[field]?.isVerified) {
        markFieldVerified(field)
        // No toast - the checkmark speaks for itself
      }
    })
  }, [getFieldStatus, snap.verifications])

  // Count verified fields
  const verifiedCount = Object.values(snap.verifications).filter(v => v?.isVerified).length
  const totalVerifiableFields = Object.keys(snap.draft).filter(key =>
    ['email', 'twitter', 'github', 'matrix', 'discord', 'web'].includes(key) && snap.draft[key as keyof IdentityData]
  ).length

  return (
    <div className="space-y-6">
      {/* Verification Summary - only show if fields exist */}
      {totalVerifiableFields > 0 && verifiedCount < totalVerifiableFields && (
        <div className="text-xs text-gray-500">
          {verifiedCount} / {totalVerifiableFields} verified
        </div>
      )}

      {/* Display Name */}
      <div className="flex items-start gap-4">
        <User className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">Display Name *</div>
          <Input
            value={snap.draft.display || ""}
            onChange={(e) => handleChange("display", e.target.value)}
            placeholder="Click to add display name"
            autoComplete="off"
            className="bg-transparent border-0 border-b border-gray-700/50 rounded-none px-0 text-white placeholder:text-gray-600 focus-visible:ring-0 focus-visible:border-pink-500"
          />
        </div>
      </div>

      {/* Legal Name */}
      <div className="flex items-start gap-4">
        <User className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">Legal Name</div>
          <Input
            value={snap.draft.legal || ""}
            onChange={(e) => handleChange("legal", e.target.value)}
            placeholder="Click to add legal name"
            autoComplete="off"
            className="bg-transparent border-0 border-b border-gray-700/50 rounded-none px-0 text-white placeholder:text-gray-600 focus-visible:ring-0 focus-visible:border-pink-500"
          />
        </div>
      </div>

      {/* Email */}
      <div className="flex items-start gap-4">
        <Mail className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">Email</div>
          <div className="flex gap-2 items-center mb-2">
            <Input
              type="email"
              value={snap.draft.email || ""}
              onChange={(e) => handleChange("email", e.target.value)}
              placeholder="Click to add email"
              autoComplete="off"
              className="bg-transparent border-0 border-b border-gray-700/50 rounded-none px-0 text-white placeholder:text-gray-600 focus-visible:ring-0 focus-visible:border-pink-500"
            />
            {snap.verifications.email?.isVerified ? (
              <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
            ) : snap.draft.email && challenges.email?.code ? (
              <Loader2 className="w-4 h-4 text-blue-400 animate-spin flex-shrink-0" />
            ) : null}
          </div>
          {snap.draft.email && challenges.email?.code && !snap.verifications.email?.isVerified && contactLinks.email && (
            <div className="mt-2 flex items-center gap-2 text-xs">
              <span className="text-gray-400">
                <span className="text-white font-mono">{challenges.email?.code}</span> to{' '}
                <a
                  href={contactLinks.email.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-pink-400 hover:text-pink-300"
                >
                  {contactLinks.email.label}
                </a>
              </span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(challenges.email?.code || "");
                }}
                className="text-pink-400 hover:text-pink-300"
              >
                copy
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedField('email');
                  setVerificationDialogOpen(true);
                }}
                className="text-gray-500 hover:text-gray-400"
              >
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Website */}
      <div className="flex items-start gap-4">
        <Globe className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">Website</div>
          <div className="flex gap-2 items-center mb-2">
            <Input
              type="url"
              value={snap.draft.web || ""}
              onChange={(e) => handleChange("web", e.target.value)}
              placeholder="Click to add website"
              autoComplete="off"
              className="bg-transparent border-0 border-b border-gray-700/50 rounded-none px-0 text-white placeholder:text-gray-600 focus-visible:ring-0 focus-visible:border-pink-500"
            />
            {snap.verifications.web?.isVerified ? (
              <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
            ) : snap.draft.web && challenges.web?.code ? (
              <Loader2 className="w-4 h-4 text-blue-400 animate-spin flex-shrink-0" />
            ) : null}
          </div>
          {snap.draft.web && challenges.web?.code && !snap.verifications.web?.isVerified && contactLinks.web && (
            <div className="mt-2 flex items-center gap-2 text-xs">
              <span className="text-gray-400">
                <span className="text-white font-mono">{challenges.web?.code}</span> to{' '}
                <a
                  href={contactLinks.web.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-pink-400 hover:text-pink-300"
                >
                  {contactLinks.web.label}
                </a>
              </span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(challenges.web?.code || "");
                }}
                className="text-pink-400 hover:text-pink-300"
              >
                copy
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedField('web');
                  setVerificationDialogOpen(true);
                }}
                className="text-gray-500 hover:text-gray-400"
              >
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Twitter */}
      <div className="flex items-start gap-4">
        <Twitter className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">Twitter / X</div>
          <div className="flex gap-2 items-center mb-2">
            <Input
              value={snap.draft.twitter || ""}
              onChange={(e) => handleChange("twitter", e.target.value)}
              placeholder="Click to add Twitter"
              autoComplete="off"
              className="bg-transparent border-0 border-b border-gray-700/50 rounded-none px-0 text-white placeholder:text-gray-600 focus-visible:ring-0 focus-visible:border-pink-500"
            />
            {snap.verifications.twitter?.isVerified ? (
              <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
            ) : snap.draft.twitter && challenges.twitter?.code ? (
              <Loader2 className="w-4 h-4 text-blue-400 animate-spin flex-shrink-0" />
            ) : null}
          </div>
          {snap.draft.twitter && challenges.twitter?.code && !snap.verifications.twitter?.isVerified && contactLinks.twitter && (
            <div className="mt-2 flex items-center gap-2 text-xs">
              <span className="text-gray-400">
                <span className="text-white font-mono">{challenges.twitter?.code}</span> to{' '}
                <a
                  href={contactLinks.twitter.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-pink-400 hover:text-pink-300"
                >
                  {contactLinks.twitter.label}
                </a>
              </span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(challenges.twitter?.code || "");
                }}
                className="text-pink-400 hover:text-pink-300"
              >
                copy
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedField('twitter');
                  setVerificationDialogOpen(true);
                }}
                className="text-gray-500 hover:text-gray-400"
              >
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* GitHub */}
      <div className="flex items-start gap-4">
        <Github className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">GitHub</div>
          <div className="flex gap-2 items-center mb-2">
            <Input
              value={snap.draft.github || ""}
              onChange={(e) => handleChange("github", e.target.value)}
              placeholder="Click to add GitHub"
              autoComplete="off"
              className="bg-transparent border-0 border-b border-gray-700/50 rounded-none px-0 text-white placeholder:text-gray-600 focus-visible:ring-0 focus-visible:border-pink-500"
            />
            {snap.verifications.github?.isVerified && (
              <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
            )}
          </div>
          {snap.draft.github && !snap.verifications.github?.isVerified && (
            <div className="mt-2 p-3 bg-yellow-900/10 rounded border border-yellow-500/30">
              <div className="text-xs text-yellow-400 mb-2">
                GitHub verification requires OAuth (coming soon)
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Matrix */}
      <div className="flex items-start gap-4">
        <MessageSquare className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">Matrix</div>
          <div className="flex gap-2 items-center mb-2">
            <Input
              value={snap.draft.matrix || ""}
              onChange={(e) => handleChange("matrix", e.target.value)}
              placeholder="Click to add Matrix"
              autoComplete="off"
              className="bg-transparent border-0 border-b border-gray-700/50 rounded-none px-0 text-white placeholder:text-gray-600 focus-visible:ring-0 focus-visible:border-pink-500"
            />
            {snap.verifications.matrix?.isVerified ? (
              <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
            ) : snap.draft.matrix && challenges.matrix?.code ? (
              <Loader2 className="w-4 h-4 text-blue-400 animate-spin flex-shrink-0" />
            ) : null}
          </div>
          {snap.draft.matrix && challenges.matrix?.code && !snap.verifications.matrix?.isVerified && contactLinks.matrix && (
            <div className="mt-2 flex items-center gap-2 text-xs">
              <span className="text-gray-400">
                <span className="text-white font-mono">{challenges.matrix?.code}</span> to{' '}
                <a
                  href={contactLinks.matrix.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-pink-400 hover:text-pink-300"
                >
                  {contactLinks.matrix.label}
                </a>
              </span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(challenges.matrix?.code || "");
                }}
                className="text-pink-400 hover:text-pink-300"
              >
                copy
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedField('matrix');
                  setVerificationDialogOpen(true);
                }}
                className="text-gray-500 hover:text-gray-400"
              >
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Discord */}
      <div className="flex items-start gap-4">
        <MessageSquare className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">Discord</div>
          <div className="flex gap-2 items-center mb-2">
            <Input
              value={snap.draft.discord || ""}
              onChange={(e) => handleChange("discord", e.target.value)}
              placeholder="Click to add Discord"
              autoComplete="off"
              className="bg-transparent border-0 border-b border-gray-700/50 rounded-none px-0 text-white placeholder:text-gray-600 focus-visible:ring-0 focus-visible:border-pink-500"
            />
            {snap.verifications.discord?.isVerified ? (
              <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
            ) : snap.draft.discord && challenges.discord?.code ? (
              <Loader2 className="w-4 h-4 text-blue-400 animate-spin flex-shrink-0" />
            ) : null}
          </div>
          {snap.draft.discord && challenges.discord?.code && !snap.verifications.discord?.isVerified && contactLinks.discord && (
            <div className="mt-2 flex items-center gap-2 text-xs">
              <span className="text-gray-400">
                <span className="text-white font-mono">{challenges.discord?.code}</span> to{' '}
                <a
                  href={contactLinks.discord.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-pink-400 hover:text-pink-300"
                >
                  {contactLinks.discord.label}
                </a>
              </span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(challenges.discord?.code || "");
                }}
                className="text-pink-400 hover:text-pink-300"
              >
                copy
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedField('discord');
                  setVerificationDialogOpen(true);
                }}
                className="text-gray-500 hover:text-gray-400"
              >
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* PGP Fingerprint */}
      <div className="flex items-start gap-4">
        <Key className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">PGP Fingerprint</div>
          <Input
            value={snap.draft.pgp_fingerprint || ""}
            onChange={(e) => handleChange("pgp_fingerprint", e.target.value)}
            placeholder="Click to add PGP fingerprint"
            autoComplete="off"
            className="bg-transparent border-0 border-b border-gray-700/50 rounded-none px-0 text-white font-mono text-sm placeholder:text-gray-600 focus-visible:ring-0 focus-visible:border-pink-500"
          />
        </div>
      </div>

      <div className="pt-4 border-t border-gray-700/50 mt-6">
        <Button
          onClick={onSubmit}
          disabled={!isDraftReadyToSubmit()}
          className="bg-pink-500 hover:bg-pink-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isEditMode ? "Update Identity" : "Submit Identity"}
        </Button>
      </div>

      {/* Verification Dialog */}
      {selectedField && contactLinks[selectedField] && challenges[selectedField]?.code && (
        <VerificationDialog
          open={verificationDialogOpen}
          onOpenChange={setVerificationDialogOpen}
          contact={contactLinks[selectedField]!}
          challengeCode={challenges[selectedField]!.code}
        />
      )}
    </div>
  )
}
