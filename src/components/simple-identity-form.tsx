"use client"

import type React from "react"
import { useState, useMemo, useEffect, useCallback } from "react"
import { FormField } from "@/components/form-field"
import { IdentityStatusInfo } from "@/components/IdentityStatusInfo"
import { verifyStatuses } from "@/types/Identity"
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
  AlertTriangle,
} from "lucide-react"
import { Separator } from "@/components/ui/separator"

export interface IdentityData {
  displayName: string
  email: string
  matrix: string
  twitter: string
  website: string
  github: string
  pgpFingerprint: string
  [key: string]: string
}

interface SimpleIdentityFormProps {
  initialData: IdentityData
  onSubmit: (data: IdentityData) => void
  isEditMode: boolean
  onDataChange: (data: IdentityData) => void
  supportedFields?: string[]
  identityStatus?: verifyStatuses
}

export function SimpleIdentityForm({
  initialData,
  onSubmit,
  isEditMode,
  onDataChange,
  supportedFields = [],
  identityStatus = verifyStatuses.NoIdentity,
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
    'display', 'email', 'web', 'twitter', 'github', 'matrix', 'pgp_fingerprint'
  ], [supportedFields])

  // Field mapping from blockchain names to our form field names
  const fieldMapping = useMemo((): Record<string, keyof IdentityData> => ({
    'display': 'displayName',
    'email': 'email',
    'web': 'website',
    'twitter': 'twitter',
    'github': 'github',
    'matrix': 'matrix',
    'pgp_fingerprint': 'pgpFingerprint'
  }), [])

  // Simple field configuration without verification
  const fieldConfig = useMemo(() => ({
    email: {
      label: "Email Address",
      icon: <Mail className="w-4 h-4 text-pink-400 mr-2" />,
      placeholder: "satoshi@example.com",
      type: "email",
    },
    website: {
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
    pgpFingerprint: {
      label: "PGP Fingerprint",
      icon: <Key className="w-4 h-4 text-pink-400 mr-2" />,
      placeholder: "XXXX XXXX XXXX XXXX XXXX XXXX XXXX XXXX XXXX XXXX",
      type: "text",
    }
  }), [])

  // Create field components only for supported fields
  const createFieldComponent = useCallback((fieldKey: string) => {
    const formFieldKey = fieldMapping[fieldKey]
    if (!formFieldKey) return null

    if (formFieldKey === 'displayName') {
      return (
        <FormField
          key="displayName"
          id="displayName"
          label="Display Name"
          icon={<User className="w-4 h-4 text-gray-400 mr-2" />}
          value={formData.displayName}
          onChange={(value) => handleChange("displayName", value)}
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
        id={formFieldKey}
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
      } else if (['email', 'web', 'twitter', 'github', 'matrix'].includes(field)) {
        contactFields.push(component)
      } else if (field === 'pgp_fingerprint') {
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
        title: "Security",
        icon: <ShieldCheck className="w-5 h-5 text-pink-400 mr-2" />,
        fields: securityFields,
      })
    }

    return sections
  }, [fieldsToShow, createFieldComponent])

  const hasDisplayName = useMemo(() => formData.displayName.trim() !== "", [formData.displayName])
  const hasOtherFields = useMemo(() => {
    const { displayName, ...otherFields } = formData
    return Object.values(otherFields).some(value => value && value.trim() !== "")
  }, [formData])

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <form onSubmit={handleFormSubmit} className="space-y-8">
      {/* Identity Status Info */}
      <IdentityStatusInfo status={identityStatus} />

      <div className="flex items-start p-3 mb-6 text-sm text-blue-300 bg-blue-900/20 border border-blue-500/30 rounded-md">
        <Info className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0 text-blue-400" />
        <span>
          You must provide your Display Name AND at least one other field to set your identity.
          {isEditMode && " After setting, you'll proceed to verification in the next step."}
        </span>
      </div>

      <div className="flex items-start p-3 mb-6 text-sm text-yellow-300 bg-yellow-900/20 border border-yellow-500/30 rounded-md">
        <AlertTriangle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0 text-yellow-400" />
        <span>
          <strong>Important:</strong> Only fill fields you are comfortable publishing on-chain.
          {isEditMode && " Changed fields will require verification in the next step."}
        </span>
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

      {/* Validation summary */}
      <div className="p-3 mt-6 text-sm bg-gray-800/50 border border-gray-600/50 rounded-md">
        <div className="flex items-center space-x-2">
          <span className={hasDisplayName ? "text-green-400" : "text-gray-400"}>
            {hasDisplayName ? "✓" : "○"} Display Name provided
          </span>
        </div>
        <div className="flex items-center space-x-2 mt-1">
          <span className={hasOtherFields ? "text-green-400" : "text-gray-400"}>
            {hasOtherFields ? "✓" : "○"} At least one additional field provided
          </span>
        </div>
        {hasDisplayName && hasOtherFields && (
          <div className="mt-2 text-green-400 text-xs">
            Ready to set identity on-chain!
          </div>
        )}
      </div>
    </form>
  )
}
