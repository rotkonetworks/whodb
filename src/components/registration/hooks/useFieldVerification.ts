import { useEffect, useState, useRef } from "react"
import { useVerification } from "@/contexts/verification-context"
import { useSnapshot } from "valtio"
import { identityDraftStore, markFieldVerified } from "@/store/IdentityDraftStore"

type VerifiableField = "email" | "twitter" | "github" | "matrix" | "discord" | "web"

export function useFieldVerification(fieldKey: string, isVerifiable: boolean) {
  const { getFieldStatus, challenges, startVerification } = useVerification()
  const draftSnap = useSnapshot(identityDraftStore)
  const [autoCopied, setAutoCopied] = useState(false)
  const lastValueRef = useRef<string>("")

  const fieldValue = String((draftSnap.draft as any)[fieldKey] || "")
  const isVerified = (draftSnap.verifications as any)[fieldKey]?.isVerified
  const challenge = challenges[fieldKey]

  // Sync verification status from context to store
  useEffect(() => {
    if (!isVerifiable) return

    const status = getFieldStatus(fieldKey as VerifiableField)
    const currentHash = draftSnap.currentIdentityHash
    if (status?.status === 'verified' && !isVerified && currentHash) {
      markFieldVerified(fieldKey as VerifiableField, currentHash)
    }
  }, [getFieldStatus, fieldKey, isVerifiable, isVerified, draftSnap.currentIdentityHash])

  // Auto-request verification when user enters a value (debounced)
  useEffect(() => {
    if (!isVerifiable || !fieldValue.trim() || isVerified || challenge?.code) return
    if (fieldValue === lastValueRef.current) return

    lastValueRef.current = fieldValue

    const timer = setTimeout(() => {
      startVerification(fieldKey, "code", fieldKey)
    }, 800) // Debounce 800ms after user stops typing

    return () => clearTimeout(timer)
  }, [fieldValue, isVerifiable, isVerified, challenge?.code, startVerification, fieldKey])

  // Auto-copy code to clipboard when generated
  useEffect(() => {
    if (challenge?.code && !autoCopied && !isVerified) {
      navigator.clipboard.writeText(challenge.code).catch(() => {})
      setAutoCopied(true)
    }
  }, [challenge?.code, autoCopied, isVerified])

  // Reset auto-copy state when field value changes
  useEffect(() => {
    setAutoCopied(false)
  }, [fieldValue])

  // Manual verification request function (fallback)
  const requestVerification = () => {
    if (!isVerifiable || !fieldValue || isVerified) return
    startVerification(fieldKey, "code", fieldKey)
  }

  return {
    isVerified,
    challenge,
    hasChallenge: Boolean(challenge?.code),
    autoCopied,
    requestVerification,
  }
}
