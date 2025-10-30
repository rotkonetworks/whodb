import { Button } from "@/components/ui/button"
import { Check, ChevronRight, Loader2, CheckCircle, User, Mail, Twitter, Github, MessageSquare, Hash, Globe, Key } from "lucide-react"
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
  { key: "display", label: "Display Name", placeholder: "satoshi", description: "How you'll be known on-chain" },
  { key: "email", label: "Email", placeholder: "satoshi@example.com", optional: true, description: "For verification only", verifiable: true },
  { key: "twitter", label: "Twitter", placeholder: "@satoshi", optional: true, verifiable: true },
  { key: "github", label: "GitHub", placeholder: "satoshi", optional: true, verifiable: true },
  { key: "matrix", label: "Matrix", placeholder: "@satoshi:matrix.org", optional: true, verifiable: true },
  { key: "discord", label: "Discord", placeholder: "satoshi#1234", optional: true, verifiable: true },
  { key: "web", label: "Website", placeholder: "bitcoin.org", optional: true, verifiable: true },
  { key: "pgp_fingerprint", label: "PGP Fingerprint", placeholder: "0x...", optional: true },
]

export function ProgressiveIdentityForm({
  initialData,
  onSubmit,
  isSubmitting
}: ProgressiveIdentityFormProps) {
  const draftSnap = useSnapshot(identityDraftStore)
  const { registrarIndex } = usePolkadotApi()
  const { registrarInfo } = useRegistrarIdentity(registrarIndex)

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
  const { isVerified, challenge, hasChallenge, requestVerification } = useFieldVerification(
    currentField.key,
    currentField.verifiable ?? false
  )

  const contactLinks = registrarInfo?.identity
    ? generateContactLinks(registrarInfo.identity)
    : {}

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
    <div className="space-y-6">
      {/* Progress indicator with icons */}
      <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
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
                "flex flex-col items-center gap-1 p-2 rounded-lg transition-all",
                "hover:bg-gray-800/50 disabled:opacity-50 disabled:cursor-not-allowed",
                isCurrent && "bg-pink-500/20 ring-2 ring-pink-500",
                isCompleted && !isCurrent && "bg-green-500/10"
              )}
              title={field.label}
            >
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                isCurrent ? "bg-pink-500 text-white" :
                isCompleted ? "bg-green-500 text-white" :
                hasValue ? "bg-blue-500/30 text-blue-400" :
                "bg-gray-700 text-gray-400"
              )}>
                {isCompleted ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
              </div>
              <span className={cn(
                "text-xs font-medium truncate w-full text-center",
                isCurrent ? "text-pink-400" :
                isCompleted ? "text-green-400" :
                hasValue ? "text-blue-400" :
                "text-gray-500"
              )}>
                {field.key === "pgp_fingerprint" ? "PGP" : field.label}
              </span>
            </button>
          )
        })}
      </div>

      {/* Field transition */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          className="space-y-4"
        >
          <div>
            <div className="flex items-baseline justify-between mb-2">
              <label className="text-lg font-medium text-white">
                {currentField.label}
                {currentField.optional && (
                  <span className="text-sm text-gray-500 ml-2">(optional)</span>
                )}
              </label>
              <span className="text-xs text-gray-500">
                {currentIndex + 1} / {FIELDS.length}
              </span>
            </div>

            <ProgressiveField
              fieldKey={currentField.key}
              label={currentField.label}
              placeholder={currentField.placeholder}
              description={currentField.description}
              value={currentValue}
              isVerifiable={currentField.verifiable ?? false}
              isVerified={isVerified ?? false}
              hasChallenge={hasChallenge}
              challengeCode={challenge?.code}
              contactLink={contactLinks[currentField.key]}
              registrarEmail={registrarInfo?.identity?.email || undefined}
              onChange={handleFieldChange}
              onKeyPress={handleKeyPress}
              onRequestVerification={requestVerification}
              disabled={isSubmitting}
            />
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleNext}
              disabled={!canProgress || isSubmitting}
              className="flex-1 bg-pink-500 hover:bg-pink-600 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : isLastField ? (
                "Complete Registration"
              ) : currentField.verifiable && currentValue && !isVerified ? (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Waiting for verification...
                </>
              ) : (
                <>
                  Continue
                  <ChevronRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>

            {currentField.optional && !isLastField && (
              <Button
                onClick={handleSkip}
                variant="ghost"
                disabled={isSubmitting}
                className="text-gray-400"
              >
                Skip
              </Button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
