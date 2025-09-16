import { IdentityStatusInfo } from "@/components/IdentityStatusInfo"
import { Separator } from "@/components/ui/separator"
import { VerifiableFormField } from "@/components/verifiable-form-field"
import { verificationConfig } from "@/config/verification-config"
import { useVerification } from "@/contexts/verification-context"
import { useTriggerLog } from "@/hooks/use-trigger-log"
import { useUrlParams } from "@/hooks/useUrlParams"
import { IdentityData, IdentityVerificationStatus } from "@/types/Identity"
import {
  AlertTriangle,
  CheckCircle,
  Github,
  Globe,
  Info,
  Key,
  Loader2,
  Mail,
  MessageSquare,
  ShieldCheck,
  Twitter,
  User,
} from "lucide-react"
import type React from "react"
import { useCallback, useEffect, useMemo } from "react"

interface IdentityVerificationFormProps {
  identityData: IdentityData
  identityStatus: IdentityVerificationStatus
  supportedFields?: string[]
}

export function IdentityVerificationForm({
  identityData,
  identityStatus,
  supportedFields = [],
}: IdentityVerificationFormProps) {
  const { urlParams: { address, network } } = useUrlParams()
  const {
    error: challengeError,
    isLoading: challengeLoading,
    challenges,
    getVerifiedFields,
    setWebSocketParams,
  } = useVerification()
  useTriggerLog(challenges, "IdentityVerificationForm Challenges")
  

  useEffect(() => {
    setWebSocketParams({ address, network, identityStatus })
  }, [address, network, identityStatus, setWebSocketParams])

  // Determine which fields to show based on chain identity data AND WebSocket challenges
  const fieldsToShow = useMemo(() => {
    const supportedSet = supportedFields.length > 0 ? supportedFields : [
      'display',
      'email',
      'web',
      'twitter',
      'github',
      'matrix',
      'pgp_fingerprint',
      'discord',
      'image',
      'legal'
    ]

    // Show fields that are either:
    // 1. Filled in the identity data from chain, OR
    // 2. Have challenges available from WebSocket (pending verification)
    const fieldsWithData = supportedSet.filter(field => 
      field && identityData[field] && identityData[field].trim() !== ""
    )
    
    const fieldsWithChallenges = Object.keys(challenges || {}).filter(field => 
      supportedSet.includes(field) && challenges[field]?.code
    )
    
    // Combine and deduplicate
    const allRelevantFields = [...new Set([...fieldsWithData, ...fieldsWithChallenges])]
    
    console.log('📋 Fields to show:', {
      fieldsWithData,
      fieldsWithChallenges, 
      allRelevantFields,
      identityData: Object.entries(identityData).filter(([k,v]) => v?.trim()),
      challenges: Object.entries(challenges || {}).filter(([k,v]) => v?.code),
      challengesWithCodes: Object.entries(challenges || {}).map(([k,v]) => ({ field: k, code: v?.code, status: v?.status }))
    })
    
    return allRelevantFields
  }, [supportedFields, identityData, challenges])

  // Field configuration with verification instructions from config
  const fieldConfig = useMemo(() => {
    const getFieldIcon = (fieldId: string) => {
      const iconMap: Record<string, React.ReactNode> = {
        email: <Mail className="w-4 h-4 text-pink-400 mr-2" />,
        web: <Globe className="w-4 h-4 text-pink-400 mr-2" />,
        twitter: <Twitter className="w-4 h-4 text-pink-400 mr-2" />,
        github: <Github className="w-4 h-4 text-pink-400 mr-2" />,
        matrix: <MessageSquare className="w-4 h-4 text-pink-400 mr-2" />,
        pgp_fingerprint: <Key className="w-4 h-4 text-pink-400 mr-2" />,
        discord: <MessageSquare className="w-4 h-4 text-pink-400 mr-2" />,
        image: <User className="w-4 h-4 text-pink-400 mr-2" />,
        legal: <User className="w-4 h-4 text-pink-400 mr-2" />,
      }
      return iconMap[fieldId] || <User className="w-4 h-4 text-pink-400 mr-2" />
    }

    const getFieldType = (fieldId: string) => {
      const typeMap: Record<string, string> = {
        email: "email",
        web: "url",
        image: "url",
      }
      return typeMap[fieldId] || "text"
    }

    const config: Record<string, any> = {}
    
    Object.entries(verificationConfig).forEach(([fieldId, fieldConfig]) => {
      config[fieldId] = {
        label: fieldConfig.label,
        icon: getFieldIcon(fieldId),
        placeholder: fieldConfig.placeholder,
        type: getFieldType(fieldId),
        verificationInstructions: {
          method: fieldConfig.instructions.method,
          contactAddress: fieldConfig.contactAddress,
          details: fieldConfig.instructions.details
        }
      }
    })

    return config
  }, [])

  // Create field components for verification
  const createVerificationComponent = useCallback((fieldKey: string) => {
    if (!fieldKey || fieldKey === 'display') return null

    const config = fieldConfig[fieldKey as keyof typeof fieldConfig]
    if (!config) return null

    return (
      <VerifiableFormField
        key={fieldKey}
        fieldId={fieldKey as any}
        label={config.label}
        icon={config.icon}
        value={identityData[fieldKey]}
        onChange={() => { }} // Read-only in verification step
        placeholder={config.placeholder}
        type={config.type}
        verificationInstructions={config.verificationInstructions}
      />
    )
  }, [identityData, fieldConfig])

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

  console.debug({ identityData, identityStatus })

  const verifiedFields = getVerifiedFields().filter(f =>
    !["", "display"].includes(f.field) && identityData[f.field] && identityData[f.field].trim() !== ""
  )
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
      {identityStatus < IdentityVerificationStatus.FeePaid
        ? (
          <div className="flex items-start p-3 text-sm text-yellow-300 bg-yellow-900/20 border border-yellow-500/30 rounded-md">
            <AlertTriangle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0 text-yellow-400" />
            <span>
              You need to request judgement and pay the verification fee to proceed with identity verification.
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
          ) : (Object.keys(challenges).length > 0 ? (
            <div className="flex items-start p-3 text-sm text-green-300 bg-green-900/20 border border-green-500/30 rounded-md">
              <CheckCircle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0 text-green-400" />
              <div>
                <span>Verification challenges are now available! Complete all field verifications below to proceed.</span>
                <div className="mt-2 text-xs text-green-200">
                  Available challenges for: {Object.entries(challenges)
                    .filter(([key, challenge]) => challenge.code)
                    .map(([key]) => key)
                    .join(", ") || "none"}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-start p-3 text-sm text-gray-300 bg-gray-900/20 border border-gray-500/30 rounded-md">
              <Info className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0 text-gray-400" />
              <span>
                No verification challenges available yet. Please check back later.
              </span>
            </div>
          )
          )
        )
      }

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
