import { Mail, Globe, MessageSquare, Github, Copy, Check, Send, Key, User } from "lucide-react"
import { useState } from "react"
import { createSafeUrl } from "@/lib/validation"
import VerificationTimeline from "@/components/verification-timeline"
import { useRegistrarIdentity } from "@/hooks/useRegistrarIdentity"

// Component to display registrar info with fetched identity
function RegistrarBadge({ registrarIndex, judgement }: { registrarIndex: number; judgement: string }) {
  const { registrarInfo, isLoading, error } = useRegistrarIdentity(registrarIndex);
  const isVerified = judgement === "Reasonable" || judgement === "KnownGood";
  const isPending = judgement === "FeePaid";

  const displayName = registrarInfo?.identity?.display || `Registrar #${registrarIndex}`;
  const registrarWeb = registrarInfo?.identity?.web;
  const registrarEmail = registrarInfo?.identity?.email;
  const contactUrl = registrarWeb ? createSafeUrl(registrarWeb, 'website') : null;

  return (
    <div className={`rounded-lg p-4 border transition-all duration-200 ${
      isVerified
        ? "bg-green-500/10 border-green-500/30"
        : isPending
        ? "bg-yellow-500/10 border-yellow-500/30"
        : "bg-gray-800/30 border-gray-700/50"
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isVerified && (
            <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
          {isPending && (
            <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-yellow-400 animate-pulse" />
            </div>
          )}
          <div className="min-w-0">
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-gray-400 text-sm">Loading registrar...</span>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  {contactUrl ? (
                    <a
                      href={contactUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white text-sm font-medium hover:text-pink-400 transition-colors"
                    >
                      {displayName}
                    </a>
                  ) : (
                    <span className="text-white text-sm font-medium">{displayName}</span>
                  )}
                  {contactUrl && (
                    <Globe className="w-3 h-3 text-gray-500" />
                  )}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">
                  {isVerified ? "Identity verified" : isPending ? "Verification pending" : "Under review"}
                  {registrarEmail && !contactUrl && (
                    <span className="ml-2 text-gray-500">({registrarEmail})</span>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-md font-medium flex-shrink-0 ${
          isVerified
            ? "bg-green-400/20 text-green-300 border border-green-400/30"
            : isPending
            ? "bg-yellow-400/20 text-yellow-300 border border-yellow-400/30"
            : "bg-gray-600/20 text-gray-300 border border-gray-600/30"
        }`}>
          {judgement}
        </span>
      </div>
    </div>
  );
}

interface ProfileDetailsSectionProps {
  displayIdentity: {
    legal?: string | null
    email?: string | null
    web?: string | null
    twitter?: string | null
    matrix?: string | null
    github?: string | null
    discord?: string | null
    pgpFingerprint?: string | null
    judgements?: Array<{ registrarIndex: number; judgement: string }>
  }
  identity: any
  timeline?: any[]
  isDraftMode: boolean
  isOwnProfile: boolean
  isVerified?: boolean
  onMessageClick: (type: 'email' | 'twitter' | 'matrix' | 'discord') => void
}

export function ProfileDetailsSection({
  displayIdentity,
  identity,
  timeline,
  isDraftMode,
  isOwnProfile,
  isVerified,
  onMessageClick
}: ProfileDetailsSectionProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null)

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(fieldName)
    setTimeout(() => setCopiedField(null), 2000)
  }

  // Check if any identity fields are filled
  const hasAnyFields = !!(
    displayIdentity.legal ||
    displayIdentity.email ||
    displayIdentity.web ||
    displayIdentity.twitter ||
    displayIdentity.matrix ||
    displayIdentity.github ||
    displayIdentity.discord ||
    displayIdentity.pgpFingerprint
  )

  return (
    <div className="pt-6 border-t border-gray-700/50">
      <div className="space-y-6">

        {/* Show message when identity exists but no fields are filled */}
        {identity && !hasAnyFields && (
          <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/50">
            <div className="flex items-center gap-3 text-gray-400">
              <User className="w-5 h-5 flex-shrink-0" />
              <div className="text-sm">
                {isVerified
                  ? "This identity is verified but has no additional information set."
                  : "This identity has no additional information set yet."}
              </div>
            </div>
          </div>
        )}

        {displayIdentity.legal && (
          <div className="flex items-start gap-4">
            <svg className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <div className="flex-1 min-w-0">
              <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">Legal Name</div>
              <div className="text-white">{displayIdentity.legal}</div>
            </div>
          </div>
        )}

        {displayIdentity.email && (
          <div className="flex items-center gap-4">
            <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">Email</div>
              <div className="text-white break-all">{displayIdentity.email}</div>
            </div>
            {!isOwnProfile && (
              <button
                onClick={() => onMessageClick('email')}
                className="p-2 text-pink-400 hover:text-pink-300 hover:bg-gray-700/50 rounded transition-colors flex-shrink-0"
                title="Send message via remailer"
              >
                <Send className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => copyToClipboard(displayIdentity.email!, 'email')}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded transition-colors flex-shrink-0"
            >
              {copiedField === 'email' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        )}

        {displayIdentity.web && (() => {
          const safeUrl = createSafeUrl(displayIdentity.web, 'website')
          return safeUrl ? (
            <div className="flex items-center gap-4">
              <Globe className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">Website</div>
                <a href={safeUrl} target="_blank" rel="noopener noreferrer" className="text-white hover:text-gray-300 break-all">
                  {displayIdentity.web}
                </a>
              </div>
              <button
                onClick={() => copyToClipboard(displayIdentity.web!, 'web')}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded transition-colors flex-shrink-0"
              >
                {copiedField === 'web' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          ) : null
        })()}

        {displayIdentity.twitter && (() => {
          const safeUrl = createSafeUrl(displayIdentity.twitter, 'twitter')
          return safeUrl ? (
            <div className="flex items-center gap-4">
              <svg className="w-4 h-4 text-gray-400 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
              <div className="flex-1 min-w-0">
                <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">Twitter</div>
                <a href={safeUrl} target="_blank" rel="noopener noreferrer" className="text-white hover:text-gray-300">
                  {displayIdentity.twitter}
                </a>
              </div>
              {!isOwnProfile && (
                <button
                  onClick={() => onMessageClick('twitter')}
                  className="p-2 text-pink-400 hover:text-pink-300 hover:bg-gray-700/50 rounded transition-colors flex-shrink-0"
                  title="Send message via remailer"
                >
                  <Send className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => copyToClipboard(displayIdentity.twitter!, 'twitter')}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded transition-colors flex-shrink-0"
              >
                {copiedField === 'twitter' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          ) : null
        })()}

        {displayIdentity.matrix && (
          <div className="flex items-center gap-4">
            <MessageSquare className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">Matrix</div>
              <div className="text-white break-all">{displayIdentity.matrix}</div>
            </div>
            {!isOwnProfile && (
              <button
                onClick={() => onMessageClick('matrix')}
                className="p-2 text-pink-400 hover:text-pink-300 hover:bg-gray-700/50 rounded transition-colors flex-shrink-0"
                title="Send message via remailer"
              >
                <Send className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => copyToClipboard(displayIdentity.matrix!, 'matrix')}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded transition-colors flex-shrink-0"
            >
              {copiedField === 'matrix' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        )}

        {displayIdentity.github && (
          <div className="flex items-center gap-4">
            <Github className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">GitHub</div>
              <div className="text-white">{displayIdentity.github}</div>
            </div>
            <button
              onClick={() => copyToClipboard(displayIdentity.github!, 'github')}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded transition-colors flex-shrink-0"
            >
              {copiedField === 'github' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        )}

        {displayIdentity.discord && (
          <div className="flex items-center gap-4">
            <MessageSquare className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">Discord</div>
              <div className="text-white">{displayIdentity.discord}</div>
            </div>
            {!isOwnProfile && (
              <button
                onClick={() => onMessageClick('discord')}
                className="p-2 text-pink-400 hover:text-pink-300 hover:bg-gray-700/50 rounded transition-colors flex-shrink-0"
                title="Send message via remailer"
              >
                <Send className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => copyToClipboard(displayIdentity.discord!, 'discord')}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded transition-colors flex-shrink-0"
            >
              {copiedField === 'discord' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        )}

        {displayIdentity.pgpFingerprint && (
          <div className="flex items-center gap-4">
            <Key className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">PGP Fingerprint</div>
              <div className="text-white font-mono text-xs break-all">{displayIdentity.pgpFingerprint}</div>
            </div>
            <button
              onClick={() => copyToClipboard(displayIdentity.pgpFingerprint!, 'pgp')}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded transition-colors flex-shrink-0"
            >
              {copiedField === 'pgp' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        )}

        {/* Always show verification section if identity exists */}
        {identity && (
          <div className="pt-6 mt-6 border-t border-gray-700/50">
            <div className="text-xs uppercase tracking-wide text-gray-500 mb-4">Verification Status</div>

            {/* Show message if no judgements exist */}
            {(!identity?.judgements || identity.judgements.length === 0) && (
              <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/50">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-gray-500"></div>
                  </div>
                  <div>
                    <span className="text-white text-sm font-medium">Not Verified</span>
                    <div className="text-xs text-gray-400 mt-0.5">
                      This identity has not been verified by any registrar yet.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {identity?.judgements && identity.judgements.length > 0 && (
              <div className="space-y-3 mb-6">
                {identity.judgements.map((judgement: any, idx: number) => (
                  <RegistrarBadge
                    key={idx}
                    registrarIndex={judgement.registrarIndex}
                    judgement={judgement.judgement}
                  />
                ))}
              </div>
            )}

            {timeline && timeline.length > 0 && (
              <div>
                <div className="text-xs uppercase tracking-wide text-gray-500 mb-4">Timeline</div>
                <VerificationTimeline timeline={timeline} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
