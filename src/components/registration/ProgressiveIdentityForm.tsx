import { useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Check, ChevronRight, Loader2, User, Mail, Twitter, Github, MessageSquare, Hash, Globe, Key } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { useSnapshot } from "valtio"
import { updateDraftField, identityDraftStore } from "@/store/IdentityDraftStore"
import { usePolkadotApi } from "@/contexts/PolkadotApiContext"
import { useRegistrarIdentity } from "@/hooks/useRegistrarIdentity"
import { generateContactLinks } from "@/utils/registrar-contacts"
import { useProgressiveNavigation, type FieldConfig } from "./hooks/useProgressiveNavigation"
import { useFieldVerification } from "./hooks/useFieldVerification"
import { ProgressiveField } from "./ProgressiveField"
import type { IdentityData } from "@/types/Identity"

const FIELD_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  display: User,
  email: Mail,
  twitter: Twitter,
  github: Github,
  matrix: MessageSquare,
  discord: Hash,
  web: Globe,
  pgp_fingerprint: Key,
}

interface ProgressiveIdentityFormProps {
  initialData: IdentityData
  onSubmit: () => void
  isSubmitting: boolean
}

const FIELDS: FieldConfig[] = [
  { key: "display", label: "Display Name", placeholder: "satoshi" },
  { key: "email", label: "Email", placeholder: "satoshi@example.com", optional: true, verifiable: true },
  { key: "twitter", label: "Twitter", placeholder: "@satoshi", optional: true, verifiable: true },
  { key: "github", label: "GitHub", placeholder: "satoshi", optional: true, verifiable: true },
  { key: "matrix", label: "Matrix", placeholder: "@satoshi:matrix.org", optional: true, verifiable: true },
  { key: "discord", label: "Discord", placeholder: "satoshi#1234", optional: true, verifiable: true },
  { key: "web", label: "Website", placeholder: "bitcoin.org", optional: true, verifiable: true },
  { key: "pgp_fingerprint", label: "PGP", placeholder: "0x...", optional: true },
]

export function ProgressiveIdentityForm({
  initialData,
  onSubmit,
  isSubmitting
}: ProgressiveIdentityFormProps) {
  const draftSnap = useSnapshot(identityDraftStore)
  const { registrarIndex } = usePolkadotApi()
  const { registrarInfo } = useRegistrarIdentity(registrarIndex)
  const prevVerifiedRef = useRef<boolean>(false)

  const {
    currentIndex,
    currentField,
    isLastField,
    completedFields,
    handleNext,
    handleSkip,
    goToField,
  } = useProgressiveNavigation({
    fields: FIELDS,
    onComplete: onSubmit,
  })

  const currentValue = String(draftSnap.draft[currentField.key] || "")
  const { isVerified, challenge, hasChallenge, autoCopied, requestVerification } = useFieldVerification(
    currentField.key,
    currentField.verifiable ?? false
  )

  const contactLinks = registrarInfo?.identity
    ? generateContactLinks(registrarInfo.identity)
    : {}

  // Auto-advance when field gets verified
  useEffect(() => {
    if (isVerified && !prevVerifiedRef.current && currentField.verifiable && !isLastField) {
      prevVerifiedRef.current = true
      // Small delay for user to see the verification success
      const timer = setTimeout(() => {
        handleNext()
      }, 500)
      return () => clearTimeout(timer)
    }
    if (!isVerified) {
      prevVerifiedRef.current = false
    }
  }, [isVerified, currentField.verifiable, isLastField, handleNext])

  // Reset ref when field changes
  useEffect(() => {
    prevVerifiedRef.current = isVerified ?? false
  }, [currentIndex])

  const canProgress = currentField.verifiable
    ? (currentValue.trim() !== "" && isVerified) || currentField.optional
    : currentValue.trim() !== "" || currentField.optional

  const handleFieldChange = (value: string) => {
    updateDraftField(currentField.key, value)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && canProgress && !isSubmitting) {
      handleNext()
    }
  }

  return (
    <div className="space-y-4">
      {/* Compact progress indicator */}
      <div className="flex gap-1 justify-center">
        {FIELDS.map((field, idx) => {
          const Icon = FIELD_ICONS[field.key] || User
          const isCompleted = completedFields.has(idx)
          const isCurrent = idx === currentIndex
          const value = draftSnap.draft[field.key]
          const hasValue = Boolean(value && String(value).trim())

          return (
            <button
              key={idx}
              type="button"
              onClick={() => goToField(idx)}
              disabled={isSubmitting}
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                "hover:scale-110 disabled:opacity-50",
                isCurrent ? "bg-pink-500 text-white ring-2 ring-pink-400 ring-offset-2 ring-offset-gray-900" :
                isCompleted ? "bg-green-500 text-white" :
                hasValue ? "bg-blue-500/50 text-blue-300" :
                "bg-gray-700 text-gray-500"
              )}
              title={field.label}
            >
              {isCompleted ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
            </button>
          )
        })}
      </div>

      {/* Current field */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.15 }}
          className="space-y-3"
        >
          <div className="flex items-center justify-between">
            <label className="text-base font-medium text-white">
              {currentField.label}
              {currentField.optional && <span className="text-gray-500 ml-1 text-sm">·</span>}
            </label>
            <span className="text-xs text-gray-600">{currentIndex + 1}/{FIELDS.length}</span>
          </div>

          <ProgressiveField
            fieldKey={currentField.key}
            label={currentField.label}
            placeholder={currentField.placeholder}
            value={currentValue}
            isVerifiable={currentField.verifiable ?? false}
            isVerified={isVerified ?? false}
            hasChallenge={hasChallenge}
            autoCopied={autoCopied}
            challengeCode={challenge?.code}
            contactLink={contactLinks[currentField.key]}
            registrarEmail={registrarInfo?.identity?.email || undefined}
            onChange={handleFieldChange}
            onKeyPress={handleKeyPress}
            onRequestVerification={requestVerification}
            disabled={isSubmitting}
          />

          {/* Simplified action row */}
          <div className="flex gap-2 pt-1">
            {currentField.optional && !isLastField ? (
              <>
                <Button
                  onClick={handleSkip}
                  variant="ghost"
                  size="sm"
                  disabled={isSubmitting}
                  className="text-gray-500 hover:text-gray-300"
                >
                  Skip
                </Button>
                <div className="flex-1" />
              </>
            ) : null}

            <Button
              onClick={handleNext}
              disabled={!canProgress || isSubmitting}
              size="sm"
              className={cn(
                "bg-pink-500 hover:bg-pink-600 disabled:opacity-40",
                !currentField.optional && "flex-1"
              )}
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isLastField ? (
                "Submit"
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </Button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
