"use client"

import type React from "react"
import { useMemo, useCallback } from "react"
import { VerifiableFormField } from "@/components/verifiable-form-field"
import { IdentityStatusInfo } from "@/components/IdentityStatusInfo"
import {
  User,
  Mail,
  MessageSquare,
  Twitter,
  Globe,
  Github,
  Key,
  ShieldCheck,
  Info,
  CheckCircle,
  AlertTriangle,
  Loader2,
} from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { useVerification } from "@/contexts/verification-context"
import { verifyStatuses, IdentityData } from "@/types/Identity"
import { usePolkadotApi } from "@/contexts/PolkadotApiContext"

interface IdentityVerificationFormProps {
  identityData: IdentityData
  identityStatus: verifyStatuses
  supportedFields?: string[]
}

export function IdentityVerificationForm({
  identityData,
  identityStatus,
  supportedFields = [],
}: IdentityVerificationFormProps) {
  const { getVerifiedFields } = useVerification()
  const { challengeError, challengeLoading } = usePolkadotApi()

  // Determine which fields to show based on supportedFields and what's filled
  const fieldsToShow = useMemo(() => {
    const supportedSet = supportedFields.length > 0 ? supportedFields : [
      'display', 'email', 'web', 'twitter', 'github', 'matrix', 'pgp_fingerprint', 'discord', 'image', 'legal'
    ]

    // Only show fields that are actually filled
    return supportedSet.filter(field => {
      const fieldMapping: Record<string, keyof IdentityData> = {
        'display': 'display',
        'email': 'email',
        'web': 'web',
        'twitter': 'twitter',
        'github': 'github',
        'matrix': 'matrix',
        'pgp_fingerprint': 'pgp_fingerprint',
        'discord': 'discord',
        'image': 'image',
        'legal': 'legal',
      }
      const formFieldKey = fieldMapping[field]
      return formFieldKey && identityData[formFieldKey] && identityData[formFieldKey].trim() !== ""
    })
  }, [supportedFields, identityData])

  // Field mapping from blockchain field names to form field names
  const fieldMapping = useMemo((): Record<string, keyof IdentityData> => ({
    'display': 'display',
    'email': 'email',
    'web': 'web',
    'twitter': 'twitter',
    'github': 'github',
    'matrix': 'matrix',
    'pgp_fingerprint': 'pgp_fingerprint',
    'discord': 'discord',
    'image': 'image',
    'legal': 'legal'
  }), [])

  // Field configuration with verification instructions
  const fieldConfig = useMemo(() => ({
    email: {
      label: "Email Address",
      icon: <Mail className="w-4 h-4 text-pink-400 mr-2" />,
      placeholder: "satoshi@example.com",
      type: "email",
      verificationInstructions: {
        method: "code" as const,
        contactAddress: import.meta.env.VITE_VERIFICATION_EMAIL || "verify@whodb.com",
        details: `Send verification code via email. You'll receive a unique code to enter for verification.`
      }
    },
    web: {
      label: "Website",
      icon: <Globe className="w-4 h-4 text-pink-400 mr-2" />,
      placeholder: "https://bitcoin.org",
      type: "url",
      verificationInstructions: {
        method: "dns-challenge" as const,
        details: `Add a TXT record to your domain's DNS with the provided challenge string. Format: TXT record for _whodb-verification.yourdomain.com`
      }
    },
    twitter: {
      label: "Twitter / X Handle",
      icon: <Twitter className="w-4 h-4 text-pink-400 mr-2" />,
      placeholder: "@satoshi",
      type: "text",
      verificationInstructions: {
        method: "code" as const,
        contactAddress: import.meta.env.VITE_VERIFICATION_TWITTER || "@whodb_verify",
        details: `Send the verification code as a direct message to ${import.meta.env.VITE_VERIFICATION_TWITTER || "@whodb_verify"} on Twitter/X.`
      }
    },
    github: {
      label: "GitHub Username",
      icon: <Github className="w-4 h-4 text-pink-400 mr-2" />,
      placeholder: "satoshi-nakamoto",
      type: "text",
      verificationInstructions: {
        method: "challenge-url" as const,
        details: `You'll receive a GitHub challenge URL from our API. Visit the URL and follow the OAuth authentication process to verify your GitHub account.`
      }
    },
    matrix: {
      label: "Matrix Handle",
      icon: <MessageSquare className="w-4 h-4 text-pink-400 mr-2" />,
      placeholder: "@satoshi:matrix.org",
      type: "text",
      verificationInstructions: {
        method: "code" as const,
        contactAddress: import.meta.env.VITE_VERIFICATION_MATRIX || "@verify:whodb.org",
        details: `Send the verification code as a message to ${import.meta.env.VITE_VERIFICATION_MATRIX || "@verify:whodb.org"} on Matrix.`
      }
    },
    pgp_fingerprint: {
      label: "PGP Fingerprint",
      icon: <Key className="w-4 h-4 text-pink-400 mr-2" />,
      placeholder: "XXXX XXXX XXXX XXXX XXXX XXXX XXXX XXXX XXXX XXXX",
      type: "text",
      verificationInstructions: {
        method: "gpg-challenge" as const,
        details: `GPG Challenge Verification Steps:
1. Copy the challenge text provided
2. Sign it with your GPG key: gpg --clearsign --armor
3. Paste the signed challenge (including -----BEGIN PGP SIGNED MESSAGE----- header)
4. Ensure your public key is available on keyservers (keys.openpgp.org or pgp.mit.edu)`
      }
    },
    discord: {
      label: "Discord Handle",
      icon: <MessageSquare className="w-4 h-4 text-pink-400 mr-2" />,
      placeholder: "username#1234",
      type: "text",
      verificationInstructions: {
        method: "code" as const,
        contactAddress: import.meta.env.VITE_VERIFICATION_DISCORD || "@whodb_verify",
        details: `Send the verification code as a direct message to ${import.meta.env.VITE_VERIFICATION_DISCORD || "@whodb_verify"} on Discord.`
      }
    },
    image: {
      label: "Avatar Image URL",
      icon: <User className="w-4 h-4 text-pink-400 mr-2" />,
      placeholder: "https://example.com/avatar.png",
      type: "url",
      verificationInstructions: {
        method: "challenge" as const,
        details: `Provide a publicly accessible URL to your avatar image.`
      }
    },
    legal: {
      label: "Legal Name",
      icon: <User className="w-4 h-4 text-pink-400 mr-2" />,
      placeholder: "John Doe",
      type: "text",
      verificationInstructions: {
        method: "challenge" as const,
        details: `Provide your full legal name for identity verification.`
      }
    }
  }), [])

  // Create field components for verification
  const createVerificationComponent = useCallback((fieldKey: string) => {
    const formFieldKey = fieldMapping[fieldKey]
    if (!formFieldKey || formFieldKey === 'display') return null

    const config = fieldConfig[formFieldKey as keyof typeof fieldConfig]
    if (!config) return null

    return (
      <VerifiableFormField
        key={formFieldKey}
        fieldId={formFieldKey as any}
        label={config.label}
        icon={config.icon}
        value={identityData[formFieldKey]}
        onChange={() => { }} // Read-only in verification step
        placeholder={config.placeholder}
        type={config.type}
        verificationInstructions={config.verificationInstructions}
      />
    )
  }, [fieldMapping, identityData, fieldConfig])

  // Group fields into sections
  const verificationSections = useMemo(() => {
    const contactFields: React.ReactElement[] = []
    const securityFields: React.ReactElement[] = []

    fieldsToShow.forEach(field => {
      if (field === 'display') return // Skip display name in verification

      const component = createVerificationComponent(field)
      if (!component) return

      if (['email', 'web', 'twitter', 'github', 'matrix'].includes(field)) {
        contactFields.push(component)
      } else if (field === 'pgp_fingerprint') {
        securityFields.push(component)
      }
    })

    const sections = []

    if (contactFields.length > 0) {
      sections.push({
        title: "Online Presence & Contact Verification",
        icon: <Globe className="w-5 h-5 text-pink-400 mr-2" />,
        fields: contactFields,
      })
    }

    if (securityFields.length > 0) {
      sections.push({
        title: "Security Verification",
        icon: <ShieldCheck className="w-5 h-5 text-pink-400 mr-2" />,
        fields: securityFields,
      })
    }

    return sections
  }, [fieldsToShow, createVerificationComponent])

  const verifiedFields = getVerifiedFields()
  const totalVerifiableFields = fieldsToShow.filter(f => f !== 'display').length
  const allFieldsVerified = totalVerifiableFields > 0 && verifiedFields.length === totalVerifiableFields

  return (
    <div className="space-y-8">
      {/* Identity Status Info */}
      <IdentityStatusInfo status={identityStatus} />

      {/* Identity Status Display */}
      <div className="bg-gray-700/30 border border-gray-600/50 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-white mb-2 flex items-center">
          <User className="w-5 h-5 mr-2 text-pink-400" />
          Identity Verification Progress
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-gray-300">Display Name:</span>
            <span className="text-white font-medium">{identityData.display}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-300">Verification Progress:</span>
            <span className="text-white font-medium">
              {verifiedFields.length} / {totalVerifiableFields} fields verified
            </span>
          </div>
        </div>
      </div>

      {/* Status-based instructions */}
      {identityStatus < verifyStatuses.FeePaid
        ? (
          <div className="flex items-start p-3 text-sm text-yellow-300 bg-yellow-900/20 border border-yellow-500/30 rounded-md">
            <AlertTriangle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0 text-yellow-400" />
            <span>
              Verification challenges are not yet available. You need to request judgement and pay the verification fee first.
            </span>
          </div>
        )
        : (challengeLoading
          ? (
            <div className="flex items-start p-3 text-sm text-blue-300 bg-blue-900/20 border border-blue-500/30 rounded-md">
              <Loader2 className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0 text-blue-400 animate-spin" />
              <span>
                Connecting to verification service to enable challenges...
              </span>
            </div>
          )
          : challengeError ? (
            <div className="flex items-start p-3 text-sm text-red-300 bg-red-900/20 border border-red-500/30 rounded-md">
              <AlertTriangle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0 text-red-400" />
              <span>
                Error connecting to verification service: {String(challengeError)}
              </span>
            </div>
          ) : null
        )
      }

      {identityStatus >= verifyStatuses.FeePaid && !challengeError && (
        <div className="flex items-start p-3 text-sm text-green-300 bg-green-900/20 border border-green-500/30 rounded-md">
          <CheckCircle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0 text-green-400" />
          <span>
            Verification challenges are now available! Complete all field verifications below to proceed.
          </span>
        </div>
      )}

      {/* Verification Sections */}
      {verificationSections.map((section, sectionIndex) => (
        <div key={section.title}>
          <div className="flex items-center mb-4">
            {section.icon}
            <h2 className="text-lg font-semibold text-white">{section.title}</h2>
          </div>
          <div className="space-y-4">{section.fields.map((fieldComponent) => fieldComponent)}</div>
          {sectionIndex < verificationSections.length - 1 && <Separator className="my-8 bg-gray-700" />}
        </div>
      ))}

      {/* Verification Complete Status */}
      {allFieldsVerified && (
        <div className="p-4 mt-6 text-sm bg-green-900/20 border border-green-500/30 rounded-md">
          <div className="flex items-center space-x-2 text-green-400">
            <CheckCircle className="w-5 h-5" />
            <span className="font-semibold">All fields verified!</span>
          </div>
          <p className="text-green-300 mt-1">
            Your identity verification is complete. You can now proceed to finalize your identity.
          </p>
        </div>
      )}

      {totalVerifiableFields === 0 && (
        <div className="p-4 mt-6 text-sm bg-blue-900/20 border border-blue-500/30 rounded-md">
          <div className="flex items-center space-x-2 text-blue-400">
            <Info className="w-5 h-5" />
            <span className="font-semibold">No additional verification needed</span>
          </div>
          <p className="text-blue-300 mt-1">
            Your identity only contains a display name, which doesn't require verification. You can proceed directly.
          </p>
        </div>
      )}
    </div>
  )
}
