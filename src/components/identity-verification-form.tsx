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
import { useCallback, useEffect, useMemo, useRef } from "react"

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
  
  // Track identity data hash to detect changes
  const identityDataRef = useRef<string>('')
  const identityDataHash = JSON.stringify(identityData)

  useEffect(() => {
    const identityDataChanged = identityDataRef.current !== identityDataHash
    
    console.log("🔄 Identity verification form - setting WebSocket params:", {
      address, network, identityStatus, identityDataChanged
    });
    
    if (identityDataChanged) {
      console.log("🔄 Identity data changed - forcing verification reset");
      identityDataRef.current = identityDataHash
    }
    
    // Force reset of verification state when identity status indicates a new judgment request
    // This ensures old verification data doesn't persist
    setWebSocketParams({ address, network, identityStatus })
  }, [address, network, identityStatus, identityDataHash, setWebSocketParams])

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
    
    const fieldsWithChallenges = Object.keys(challenges || {}).filter(field => {
      const hasChallenge = challenges[field]?.code
      const isSupported = supportedSet.includes(field)
      console.log(`🔍 Field ${field}: hasChallenge=${hasChallenge}, isSupported=${isSupported}`)
      return isSupported && hasChallenge
    })
    
    // Combine and deduplicate
    const allRelevantFields = [...new Set([...fieldsWithData, ...fieldsWithChallenges])]
    
    console.log('📋 Fields to show:', {
      supportedSet,
      fieldsWithData,
      fieldsWithChallenges, 
      allRelevantFields,
      identityData: Object.entries(identityData).filter(([k,v]) => v?.trim()),
      challenges: Object.entries(challenges || {}),
      challengesWithCodes: Object.entries(challenges || {}).map(([k,v]) => ({ field: k, code: v?.code, status: v?.status, hasCode: !!v?.code }))
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

      {/* Compact progress indicator */}
      <div className="flex items-center justify-between p-3 bg-gray-800/30 border border-gray-700/50 rounded">
        <div className="flex items-center gap-3">
          <User className="w-4 h-4 text-pink-400" />
          <span className="text-sm text-gray-300">
            <strong className="text-white">{identityData.display}</strong>
          </span>
        </div>
        <div className="text-sm">
          <span className={verifiedFields.length === totalVerifiableFields && totalVerifiableFields > 0 ? "text-green-400" : "text-gray-400"}>
            {verifiedFields.length}/{totalVerifiableFields} verified
          </span>
        </div>
      </div>

      {/* Compact status indicator */}
      {identityStatus >= IdentityVerificationStatus.FeePaid && (
        <div className="flex items-center justify-between p-2 text-xs bg-gray-800/30 border border-gray-700/50 rounded">
          <div className="flex items-center gap-2">
            {challengeLoading ? (
              <>
                <Loader2 className="w-3 h-3 text-blue-400 animate-spin" />
                <span className="text-blue-400">Connecting to verification service...</span>
              </>
            ) : challengeError ? (
              <>
                <AlertTriangle className="w-3 h-3 text-red-400" />
                <span className="text-red-400">Connection error</span>
              </>
            ) : Object.keys(challenges).length > 0 ? (
              <>
                <CheckCircle className="w-3 h-3 text-green-400" />
                <span className="text-green-400">Challenges available for {Object.keys(challenges).length} field(s)</span>
              </>
            ) : (
              <>
                <Info className="w-3 h-3 text-gray-400" />
                <span className="text-gray-400">Waiting for challenges...</span>
              </>
            )}
          </div>
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
