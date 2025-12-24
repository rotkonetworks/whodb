import { useState, useCallback, memo, useEffect, useMemo } from "react"
import { Mail, Globe, MessageSquare, Github, Key, User, Send, Copy, Check, Save, Loader2, CheckCircle } from "lucide-react"
import { InlineEditField } from "./InlineEditField"
import { AccountRelations } from "./AccountRelations"
import { Button } from "@/components/ui/button"
import { useSnapshot } from "valtio"
import { updateDraftField, identityDraftStore, initializeDraft, clearDraft } from "@/store/IdentityDraftStore"
import { createSafeUrl } from "@/lib/validation"
import { SS58String } from "polkadot-api"
import { useVerification } from "@/contexts/verification-context"
import { ChallengeStatus } from "@/store/challengesStore"
import { usePolkadotApi } from "@/contexts/PolkadotApiContext"
import { useRegistrarIdentity } from "@/hooks/useRegistrarIdentity"
import { generateContactLinks } from "@/utils/registrar-contacts"
import { toast } from "sonner"

interface ProfileContentProps {
  identity: {
    display?: string | null
    legal?: string | null
    email?: string | null
    web?: string | null
    twitter?: string | null
    matrix?: string | null
    github?: string | null
    discord?: string | null
    image?: string | null
    pgpFingerprint?: string | null
    judgements?: Array<{ registrarIndex: number; judgement: string }>
  } | null
  address: SS58String
  network: string
  peopleChain: string | null
  isOwnProfile: boolean
  isVerified?: boolean
  onMessageClick?: (type: 'email' | 'twitter' | 'matrix' | 'discord') => void
  onSave?: () => void
  isSaving?: boolean
}

export const ProfileContent = memo(function ProfileContent({
  identity,
  address,
  network,
  peopleChain,
  isOwnProfile,
  onMessageClick,
  onSave,
  isSaving = false,
}: ProfileContentProps) {
  const draftSnap = useSnapshot(identityDraftStore)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [checkingField, setCheckingField] = useState<string | null>(null)

  // Verification context
  const { challenges, confirmVerification, verifications } = useVerification()
  const { registrarIndex } = usePolkadotApi()
  const { registrarInfo } = useRegistrarIdentity(registrarIndex)

  // Generate contact links from registrar identity
  const contactLinks = useMemo(() => {
    return registrarInfo?.identity
      ? generateContactLinks(registrarInfo.identity)
      : {}
  }, [registrarInfo?.identity])

  // Get pending challenges to display
  const pendingChallenges = useMemo(() => {
    const pending: Array<{
      field: string
      label: string
      value: string | null
      code: string
      status: ChallengeStatus
      contactLink?: { url: string; label: string }
    }> = []

    const fieldConfig: Record<string, { label: string; getValue: () => string | null }> = {
      email: { label: "Email Address", getValue: () => identity?.email || null },
      matrix: { label: "Matrix Handle", getValue: () => identity?.matrix || null },
      twitter: { label: "Twitter", getValue: () => identity?.twitter || null },
      discord: { label: "Discord", getValue: () => identity?.discord || null },
      github: { label: "GitHub", getValue: () => identity?.github || null },
      web: { label: "Website", getValue: () => identity?.web || null },
    }

    Object.entries(challenges).forEach(([field, challenge]) => {
      if (challenge && challenge.status === ChallengeStatus.Pending && challenge.code) {
        const config = fieldConfig[field]
        if (config) {
          pending.push({
            field,
            label: config.label,
            value: challenge.accountName || config.getValue(),
            code: challenge.code,
            status: challenge.status,
            contactLink: contactLinks[field as keyof typeof contactLinks],
          })
        }
      }
    })

    return pending
  }, [challenges, identity, contactLinks])

  // Check verification status
  const handleCheckVerification = useCallback(async (field: string) => {
    setCheckingField(field)
    try {
      const result = await confirmVerification(field as any, undefined as any)
      if (result) {
        toast.success(`${field} verified successfully!`)
      }
    } catch (error) {
      console.error(`Failed to check verification for ${field}:`, error)
    } finally {
      setCheckingField(null)
    }
  }, [confirmVerification])

  // Compute hasChanges by comparing draft with original on-chain identity
  const hasChanges = useMemo(() => {
    if (!isOwnProfile) return false
    const keys = Object.keys(draftSnap.original) as (keyof typeof draftSnap.original)[]
    return keys.some(key => {
      const draftVal = draftSnap.draft[key] || ''
      const origVal = draftSnap.original[key] || ''
      return draftVal !== origVal
    })
  }, [isOwnProfile, draftSnap.draft, draftSnap.original])

  // Reset if come from other profile
  useEffect(() => {
    clearDraft()
  }, [address])

  useEffect(() => {
    if (isOwnProfile && identity) {
      initializeDraft({
        display: identity.display || "",
        legal: identity.legal || "",
        email: identity.email || "",
        web: identity.web || "",
        twitter: identity.twitter || "",
        matrix: identity.matrix || "",
        github: identity.github || "",
        discord: identity.discord || "",
        image: identity.image || "",
        pgp_fingerprint: identity.pgpFingerprint || "",
      })
    }
  }, [isOwnProfile, identity?.display, identity?.legal, identity?.email, identity?.web, identity?.twitter, identity?.matrix, identity?.github, identity?.discord, identity?.image, identity?.pgpFingerprint])

  const copyToClipboard = useCallback((text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }, [])

  // Use draft values for own profile, identity values for others
  const getValue = useCallback((field: string) => {
    if (isOwnProfile) {
      return draftSnap.draft[field as keyof typeof draftSnap.draft] || identity?.[field as keyof typeof identity] || null
    }
    return identity?.[field as keyof typeof identity] || null
  }, [isOwnProfile, draftSnap.draft, identity])

  const handleFieldChange = useCallback((field: string, value: string) => {
    updateDraftField(field as any, value)
  }, [])

  return (
    <div className="space-y-6">
      {/* Save button - shown when user has edited a field */}
      {isOwnProfile && hasChanges && (
        <div className="flex items-center justify-between p-3 bg-pink-500/10 border border-pink-500/30 rounded-lg">
          <span className="text-sm text-pink-300">You have unsaved changes</span>
          <Button
            onClick={onSave}
            disabled={isSaving}
            size="sm"
            className="bg-pink-500 hover:bg-pink-600"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save to Chain
          </Button>
        </div>
      )}

      {/* Identity Fields */}
      <div className="space-y-1 divide-y divide-gray-800/50">
        <InlineEditField
          label="Display Name"
          value={getValue("display") as string}
          placeholder="Your display name"
          icon={<User className="w-full h-full" />}
          editable={isOwnProfile}
          onChange={(v) => handleFieldChange("display", v)}
        />

        <InlineEditField
          label="Legal Name"
          value={getValue("legal") as string}
          placeholder="Legal name (optional)"
          icon={<User className="w-full h-full" />}
          editable={isOwnProfile}
          onChange={(v) => handleFieldChange("legal", v)}
        />

        <div className="flex items-center">
          <div className="flex-1">
            <InlineEditField
              label="Email"
              value={getValue("email") as string}
              placeholder="email@example.com"
              icon={<Mail className="w-full h-full" />}
              editable={isOwnProfile}
              onChange={(v) => handleFieldChange("email", v)}
            />
          </div>
          {!isOwnProfile && getValue("email") && (
            <div className="flex gap-1 pr-2">
              <button
                onClick={() => onMessageClick?.("email")}
                className="p-2 text-pink-400 hover:text-pink-300 hover:bg-gray-700/50 rounded transition-colors"
                title="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
              <button
                onClick={() => copyToClipboard(getValue("email") as string, "email")}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded transition-colors"
              >
                {copiedField === "email" ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          )}
        </div>

        <InlineEditField
          label="Website"
          value={getValue("web") as string}
          placeholder="yoursite.com"
          icon={<Globe className="w-full h-full" />}
          editable={isOwnProfile}
          onChange={(v) => handleFieldChange("web", v)}
          link={getValue("web") ? createSafeUrl(getValue("web") as string, "website") || undefined : undefined}
        />

        <div className="flex items-center">
          <div className="flex-1">
            <InlineEditField
              label="Twitter"
              value={getValue("twitter") as string}
              placeholder="@handle"
              icon={
                <svg className="w-full h-full" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              }
              editable={isOwnProfile}
              onChange={(v) => handleFieldChange("twitter", v)}
              link={getValue("twitter") ? createSafeUrl(getValue("twitter") as string, "twitter") || undefined : undefined}
            />
          </div>
          {!isOwnProfile && getValue("twitter") && (
            <button
              onClick={() => onMessageClick?.("twitter")}
              className="p-2 text-pink-400 hover:text-pink-300 hover:bg-gray-700/50 rounded transition-colors mr-2"
              title="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          )}
        </div>

        <InlineEditField
          label="GitHub"
          value={getValue("github") as string}
          placeholder="username"
          icon={<Github className="w-full h-full" />}
          editable={isOwnProfile}
          onChange={(v) => handleFieldChange("github", v)}
          link={getValue("github") ? `https://github.com/${getValue("github")}` : undefined}
        />

        <div className="flex items-center">
          <div className="flex-1">
            <InlineEditField
              label="Matrix"
              value={getValue("matrix") as string}
              placeholder="@user:matrix.org"
              icon={<MessageSquare className="w-full h-full" />}
              editable={isOwnProfile}
              onChange={(v) => handleFieldChange("matrix", v)}
            />
          </div>
          {!isOwnProfile && getValue("matrix") && (
            <button
              onClick={() => onMessageClick?.("matrix")}
              className="p-2 text-pink-400 hover:text-pink-300 hover:bg-gray-700/50 rounded transition-colors mr-2"
              title="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center">
          <div className="flex-1">
            <InlineEditField
              label="Discord"
              value={getValue("discord") as string}
              placeholder="username#1234"
              icon={<MessageSquare className="w-full h-full" />}
              editable={isOwnProfile}
              onChange={(v) => handleFieldChange("discord", v)}
            />
          </div>
          {!isOwnProfile && getValue("discord") && (
            <button
              onClick={() => onMessageClick?.("discord")}
              className="p-2 text-pink-400 hover:text-pink-300 hover:bg-gray-700/50 rounded transition-colors mr-2"
              title="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          )}
        </div>

        <InlineEditField
          label="PGP Fingerprint"
          value={getValue("pgpFingerprint") as string}
          placeholder="0xABCD..."
          icon={<Key className="w-full h-full" />}
          editable={isOwnProfile}
          onChange={(v) => handleFieldChange("pgp_fingerprint", v)}
          mono
        />
      </div>

      {/* Verification Status */}
      {(identity?.judgements?.length || (isOwnProfile && pendingChallenges.length > 0)) && (
        <div className="pt-4 border-t border-gray-700/50">
          <div className="text-xs uppercase tracking-wide text-gray-500 mb-3">Verification</div>
          <div className="space-y-3">
            {/* Judgement status */}
            {identity?.judgements?.map((j, i) => (
              <div
                key={i}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  j.judgement === "Reasonable" || j.judgement === "KnownGood"
                    ? "bg-green-500/10 border-green-500/30"
                    : j.judgement === "FeePaid"
                    ? "bg-yellow-500/10 border-yellow-500/30"
                    : "bg-gray-800/30 border-gray-700/50"
                }`}
              >
                <span className="text-sm text-gray-300">Registrar #{j.registrarIndex}</span>
                <span className={`text-xs px-2 py-1 rounded ${
                  j.judgement === "Reasonable" || j.judgement === "KnownGood"
                    ? "bg-green-400/20 text-green-300"
                    : j.judgement === "FeePaid"
                    ? "bg-yellow-400/20 text-yellow-300"
                    : "bg-gray-600/20 text-gray-300"
                }`}>
                  {j.judgement}
                </span>
              </div>
            ))}

            {/* Pending verification challenges */}
            {isOwnProfile && pendingChallenges.length > 0 && (
              <div className="space-y-3 mt-4">
                <div className="flex items-center gap-2 text-sm text-green-400">
                  <CheckCircle className="w-4 h-4" />
                  <span>Challenges available for {pendingChallenges.length} field(s)</span>
                </div>

                {pendingChallenges.map((challenge) => (
                  <div key={challenge.field} className="bg-gray-800/50 rounded-lg border border-gray-700/50 overflow-hidden">
                    {/* Header with field info and check button */}
                    <div className="flex items-center justify-between p-3 border-b border-gray-700/50">
                      <div className="flex items-center gap-2">
                        {challenge.field === "email" && <Mail className="w-4 h-4 text-gray-400" />}
                        {challenge.field === "matrix" && <MessageSquare className="w-4 h-4 text-gray-400" />}
                        {challenge.field === "twitter" && (
                          <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                          </svg>
                        )}
                        {challenge.field === "discord" && <MessageSquare className="w-4 h-4 text-gray-400" />}
                        {challenge.field === "github" && <Github className="w-4 h-4 text-gray-400" />}
                        {challenge.field === "web" && <Globe className="w-4 h-4 text-gray-400" />}
                        <span className="text-sm text-white font-medium">{challenge.label}</span>
                        <Loader2 className="w-4 h-4 text-yellow-400 animate-spin" />
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCheckVerification(challenge.field)}
                        disabled={checkingField === challenge.field}
                        className="text-xs border-gray-600 hover:bg-gray-700"
                      >
                        {checkingField === challenge.field ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          "Check Verification"
                        )}
                      </Button>
                    </div>

                    {/* Account value */}
                    {challenge.value && (
                      <div className="px-3 py-2 bg-gray-900/50">
                        <span className="text-sm text-gray-300 font-mono">{challenge.value}</span>
                      </div>
                    )}

                    {/* Instructions and code */}
                    <div className="p-3 bg-yellow-500/5 border-t border-yellow-500/20">
                      <div className="text-xs text-yellow-400 font-medium mb-2">Action Required:</div>
                      <p className="text-xs text-gray-400 mb-2">
                        {challenge.field === "email" && "We'll send a verification code to your email address. Reply with the code to complete verification."}
                        {challenge.field === "matrix" && (
                          <>
                            Send the verification code to our Matrix registrar bot via direct message.
                            {challenge.contactLink && (
                              <a
                                href={challenge.contactLink.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-pink-400 hover:text-pink-300 ml-1"
                              >
                                {challenge.contactLink.label}
                              </a>
                            )}
                          </>
                        )}
                        {challenge.field === "twitter" && "Tweet or DM the verification code to complete verification."}
                        {challenge.field === "discord" && "Send the verification code via Discord to complete verification."}
                        {challenge.field === "github" && "Create a gist with the verification code to complete verification."}
                        {challenge.field === "web" && "Add the verification code to your website to complete verification."}
                      </p>
                      <div className="flex items-center gap-2 bg-gray-900 rounded px-3 py-2">
                        <code className="flex-1 text-sm text-white font-mono">{challenge.code}</code>
                        <button
                          onClick={() => copyToClipboard(challenge.code, `code-${challenge.field}`)}
                          className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
                          title="Copy code"
                        >
                          {copiedField === `code-${challenge.field}` ? (
                            <Check className="w-4 h-4 text-green-400" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Account Relations */}
      <div className="pt-4 border-t border-gray-700/50">
        <AccountRelations
          address={address}
          network={network}
          peopleChain={peopleChain}
          isOwnProfile={isOwnProfile}
        />
      </div>
    </div>
  )
})
