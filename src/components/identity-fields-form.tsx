"use client"

import type React from "react"
import { useState, useMemo, useEffect, useCallback } from "react" // Added useEffect and useCallback
import { FormField } from "@/components/form-field"
import { FieldRequirements } from "@/components/field-requirements"
import { VerifiableFormField } from "@/components/verifiable-form-field"
import { useVerification } from "@/contexts/verification-context"
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
  // Exporting for use in register page
  displayName: string
  email: string
  matrix: string
  twitter: string
  website: string
  github: string
  pgpFingerprint: string
  [key: string]: string // Add index signature for compatibility
}

interface IdentityFieldsFormProps {
  initialData: IdentityData
  onSubmit: (data: IdentityData) => void // onSubmit might not be used if validation is external
  isSubmitting: boolean
  isEditMode: boolean // New prop to indicate if we are editing
  onDataChange: (data: IdentityData) => void // Callback to inform parent of data changes
  canVerifyFields?: boolean // Whether field verification is available (FeePaid status)
  supportedFields?: string[] // List of supported fields from the registrar
}

export function IdentityFieldsForm({
  initialData,
  onSubmit,
  isSubmitting,
  isEditMode,
  onDataChange,
  canVerifyFields = false,
  supportedFields = [], // Default to empty array
}: IdentityFieldsFormProps) {
  const [formData, setFormData] = useState(initialData)
  const { getVerifiedFields, resetFieldVerification } = useVerification()

  // When initialData changes (e.g., loaded for edit mode), update formData
  useEffect(() => {
    setFormData(initialData)
    if (isEditMode) {
      // If editing, we could set initial verification statuses based on `initialData`
      // For now, the requirement is to re-verify all changed fields.
      // So, when a field *changes*, its status is reset.
      // Or, we could reset all verifiable fields to 'unverified' when edit mode starts.
      const fieldsToReset: (keyof IdentityData)[] = [
        "email",
        "matrix",
        "twitter",
        "website",
        "github",
        "pgpFingerprint",
      ]
      fieldsToReset.forEach((field) => {
        if (initialData[field]) {
          // Only reset if there was initial data, implying it might need re-verification
          resetFieldVerification(String(field))
        }
      })
    }
    // Remove resetFieldVerification and setInitialVerifications from deps to avoid infinite loop
  }, [initialData, isEditMode])

  const handleChange = useCallback((field: keyof IdentityData, value: string) => {
    const newFormData = { ...formData, [field]: value }
    setFormData(newFormData)
    onDataChange(newFormData) // Inform parent of data change

    if (isEditMode && field !== "displayName") {
      // If in edit mode and a verifiable field changes, reset its verification status
      // Only reset if the new value is different from the initial value for that field
      if (value !== initialData[field]) {
        resetFieldVerification(String(field))
      }
    }
  }, [formData, onDataChange, isEditMode, initialData, resetFieldVerification])

  const verifiedFieldsCount = useMemo(() => getVerifiedFields().length, [getVerifiedFields])

  // This internal handleSubmit is not directly used by a submit button within this form anymore.
  // The parent (register page) controls submission.
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Validation logic is now primarily in the parent component (RegisterPage)
    // using canProceedFromIdentityStep.
    onSubmit(formData)
  }

  // Determine which fields to show based on supportedFields
  // If supportedFields is empty, show all fields (fallback)
  const fieldsToShow = useMemo(() => supportedFields.length > 0 ? supportedFields : [
    'display', 'email', 'web', 'twitter', 'github', 'matrix', 'pgp_fingerprint'
  ], [supportedFields])

  // Field mapping from blockchain names to our form field names - memoized
  const fieldMapping = useMemo((): Record<string, keyof IdentityData> => ({
    'display': 'displayName',
    'email': 'email',
    'web': 'website',
    'twitter': 'twitter',
    'github': 'github',
    'matrix': 'matrix',
    'pgp_fingerprint': 'pgpFingerprint'
  }), [])

  // Memoize field configuration to prevent recreation
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
    website: {
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
    pgpFingerprint: {
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
    }
  }), [])

  // Create field components only for supported fields - memoized
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
      <VerifiableFormField
        key={formFieldKey}
        fieldId={formFieldKey as any}
        label={config.label}
        icon={config.icon}
        value={formData[formFieldKey]}
        onChange={(value) => handleChange(formFieldKey, value)}
        placeholder={config.placeholder}
        type={config.type}
        verificationInstructions={config.verificationInstructions}
      />
    )
  }, [fieldMapping, formData, handleChange, fieldConfig])

  // Group fields into sections based on what's supported - memoized
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

    // Only create sections that have fields
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

  return (
    // The form tag is still here, but submission is handled by parent.
    <form onSubmit={handleFormSubmit} className="space-y-8">
      <FieldRequirements verifiedFieldsCount={verifiedFieldsCount} hasDisplayName={hasDisplayName} className="mb-6" />

      <div className="flex items-start p-3 mb-6 text-sm text-yellow-300 bg-yellow-900/20 border border-yellow-500/30 rounded-md">
        <AlertTriangle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0 text-yellow-400" />
        <span>
          <strong>Important:</strong> Only fill fields you are comfortable publishing and verifying online.
          {isEditMode && " Changed fields will require re-verification."}
        </span>
      </div>

      <div className="flex items-start p-3 mb-6 text-sm text-blue-300 bg-blue-900/20 border border-blue-500/30 rounded-md">
        <Info className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0 text-blue-400" />
        <span>
          You must fill your Display Name OR fill and <strong>successfully verify at least one other field</strong> to
          continue. All other entered fields must also be verified.
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
      {/* Submit button is typically in the parent RegisterPage now */}
    </form>
  )
}
