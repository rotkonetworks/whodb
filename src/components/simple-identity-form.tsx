import type React from "react"
import { useState, useMemo, useEffect, useCallback } from "react"
import { FormField } from "@/components/form-field"
import { IdentityStatusInfo } from "@/components/IdentityStatusInfo"
import { IdentityVerificationStatus, IdentityData } from "@/types/Identity"
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
} from "lucide-react"
import { Separator } from "@/components/ui/separator"

interface SimpleIdentityFormProps {
  initialData: IdentityData
  onSubmit: (data: IdentityData) => void
  isEditMode: boolean
  onDataChange: (data: IdentityData) => void
  supportedFields?: string[]
  identityStatus?: IdentityVerificationStatus
}

export function SimpleIdentityForm({
  initialData,
  onSubmit,
  isEditMode,
  onDataChange,
  supportedFields = [],
  identityStatus = IdentityVerificationStatus.NoIdentity,
}: SimpleIdentityFormProps) {
  const [formData, setFormData] = useState(initialData)

  // When initialData changes, update formData
  useEffect(() => {
    setFormData(initialData)
  }, [initialData, isEditMode])

  const handleChange = useCallback((field: keyof IdentityData, value: string) => {
    const newFormData = { ...formData, [field]: value }
    setFormData(newFormData)
    onDataChange(newFormData)
  }, [formData, onDataChange])

  // Determine which fields to show based on supportedFields
  const fieldsToShow = useMemo(() => supportedFields.length > 0 ? supportedFields : [
    'display', 'email', 'web', 'twitter', 'github', 'matrix', 'pgp_fingerprint', 'discord', 'image', 'legal'
  ], [supportedFields])

  // Field mapping from blockchain names to our form field names
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

  // Simple field configuration without verification
  const fieldConfig = useMemo(() => ({
    email: {
      label: "Email Address",
      icon: <Mail className="w-4 h-4 text-pink-400 mr-2" />,
      placeholder: "satoshi@example.com",
      type: "email",
    },
    web: {
      label: "Website",
      icon: <Globe className="w-4 h-4 text-pink-400 mr-2" />,
      placeholder: "https://bitcoin.org",
      type: "url",
    },
    twitter: {
      label: "Twitter / X Handle",
      icon: <Twitter className="w-4 h-4 text-pink-400 mr-2" />,
      placeholder: "@satoshi",
      type: "text",
    },
    github: {
      label: "GitHub Username",
      icon: <Github className="w-4 h-4 text-pink-400 mr-2" />,
      placeholder: "satoshi-nakamoto",
      type: "text",
    },
    matrix: {
      label: "Matrix Handle",
      icon: <MessageSquare className="w-4 h-4 text-pink-400 mr-2" />,
      placeholder: "@satoshi:matrix.org",
      type: "text",
    },
    pgp_fingerprint: {
      label: "PGP Fingerprint",
      icon: <Key className="w-4 h-4 text-pink-400 mr-2" />,
      placeholder: "0x123456789abcdef123456789abcdef",
      type: "text",
    },
    discord: {
      label: "Discord Handle",
      icon: <MessageSquare className="w-4 h-4 text-pink-400 mr-2" />,
      placeholder: "username#1234",
      type: "text",
    },
    image: {
      label: "Avatar Image URL",
      icon: <User className="w-4 h-4 text-pink-400 mr-2" />,
      placeholder: "https://example.com/avatar.png",
      type: "url",
    },
    legal: {
      label: "Legal Name",
      icon: <User className="w-4 h-4 text-pink-400 mr-2" />,
      placeholder: "John Doe",
      type: "text",
    }
  }), [])

  // Create field components only for supported fields
  const createFieldComponent = useCallback((fieldKey: string) => {
    const formFieldKey = fieldMapping[fieldKey]
    if (!formFieldKey) return null

    if (formFieldKey === 'display') {
      return (
        <FormField
          key="display"
          id="display"
          label="Display Name"
          icon={<User className="w-4 h-4 text-gray-400 mr-2" />}
          value={formData.display}
          onChange={(value) => handleChange("display", value)}
          placeholder="e.g., Satoshi Nakamoto"
          description="This name will be publicly visible. Verified on-chain after submission."
          className="p-3 bg-gray-800/50 border border-gray-700 rounded-lg"
        />
      )
    }

    const config = fieldConfig[formFieldKey as keyof typeof fieldConfig]
    if (!config) return null

    return (
      <FormField
        key={formFieldKey}
        id={String(formFieldKey)}
        label={config.label}
        icon={config.icon}
        value={formData[formFieldKey]}
        onChange={(value) => handleChange(formFieldKey, value)}
        placeholder={config.placeholder}
        type={config.type}
        className="p-3 bg-gray-800/50 border border-gray-700 rounded-lg"
      />
    )
  }, [fieldMapping, formData, handleChange, fieldConfig])

  // Group fields into sections
  const formSections = useMemo(() => {
    const primaryFields: React.ReactElement[] = []
    const contactFields: React.ReactElement[] = []
    const securityFields: React.ReactElement[] = []

    fieldsToShow.forEach(field => {
      const component = createFieldComponent(field)
      if (!component) return

      if (field === 'display') {
        primaryFields.push(component)
      } else if (['email', 'web', 'twitter', 'github', 'matrix', 'discord'].includes(field)) {
        contactFields.push(component)
      } else if (['pgp_fingerprint', 'image', 'legal'].includes(field)) {
        securityFields.push(component)
      }
    })

    const sections = []

    if (primaryFields.length > 0) {
      sections.push({
        title: "Primary Identity",
        icon: <User className="w-5 h-5 text-pink-400 mr-2" />,
        fields: primaryFields,
      })
    }

    if (contactFields.length > 0) {
      sections.push({
        title: "Online Presence & Contact",
        icon: <Globe className="w-5 h-5 text-pink-400 mr-2" />,
        fields: contactFields,
      })
    }

    if (securityFields.length > 0) {
      sections.push({
        title: "Security & Additional Info",
        icon: <ShieldCheck className="w-5 h-5 text-pink-400 mr-2" />,
        fields: securityFields,
      })
    }

    return sections
  }, [fieldsToShow, createFieldComponent])

  const hasDisplayName = useMemo(() => formData.display.trim() !== "", [formData.display])
  const hasOtherFields = useMemo(() => {
    const { display, ...otherFields } = formData
    return Object.values(otherFields).some(value => value && value.trim() !== "")
  }, [formData])

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Identity Status Info */}
      <IdentityStatusInfo status={identityStatus} />

      {/* Combined info box for requirements */}
      <div className="flex items-start p-3 mb-6 text-sm text-gray-300 bg-gray-800/50 border border-gray-600/50 rounded-md">
        <Info className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0 text-gray-400" />
        <div>
          <div className="mb-1">
            You must provide your <strong className="text-white">Display Name</strong> AND at least <strong className="text-white">one other field</strong> to set your identity.
          </div>
          <div className="text-xs text-gray-400">
            <strong>Important:</strong> Only fill fields you are comfortable publishing on-chain.
          </div>
        </div>
      </div>

      {formSections.map((section, sectionIndex) => (
        <div key={section.title}>
          <div className="flex items-center mb-4">
            {section.icon}
            <h2 className="text-lg font-semibold text-white">{section.title}</h2>
          </div>
          <div className="space-y-4">{section.fields.map((fieldComponent) => fieldComponent)}</div>
          {sectionIndex < formSections.length - 1 && <Separator className="my-8 bg-gray-700" />}
        </div>
      ))}

      {/* Compact validation status */}
      <div className="flex items-center justify-between p-2 mt-4 text-xs bg-gray-800/30 border border-gray-700/50 rounded">
        <div className="flex items-center gap-4">
          <span className={hasDisplayName ? "text-green-400" : "text-gray-500"}>
            {hasDisplayName ? "✓" : "○"} Display Name
          </span>
          <span className={hasOtherFields ? "text-green-400" : "text-gray-500"}>
            {hasOtherFields ? "✓" : "○"} Additional field
          </span>
        </div>
        {hasDisplayName && hasOtherFields && (
          <span className="text-green-400">
            Ready to submit!
          </span>
        )}
      </div>
    </form>
  )
}
