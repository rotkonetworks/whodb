import { useState, useCallback, memo, useEffect } from "react"
import { Mail, Globe, MessageSquare, Github, Key, User, Send, Copy, Check, Save, Loader2 } from "lucide-react"
import { InlineEditField } from "./InlineEditField"
import { AccountRelations } from "./AccountRelations"
import { Button } from "@/components/ui/button"
import { useSnapshot } from "valtio"
import { updateDraftField, identityDraftStore, initializeDraft, clearDraft } from "@/store/IdentityDraftStore"
import { createSafeUrl } from "@/lib/validation"
import { SS58String } from "polkadot-api"

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
  const [hasChanges, setHasChanges] = useState(false)

  // Reset if come from other profile
  useEffect(() => {
    setHasChanges(false)
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
    setHasChanges(true)
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
      {identity?.judgements && identity.judgements.length > 0 && (
        <div className="pt-4 border-t border-gray-700/50">
          <div className="text-xs uppercase tracking-wide text-gray-500 mb-3">Verification</div>
          <div className="space-y-2">
            {identity.judgements.map((j, i) => (
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
